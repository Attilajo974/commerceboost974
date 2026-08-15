import { and, desc, eq, gte, like, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { customers, orderItems, orders, orderStatusHistory, products } from "../../drizzle/schema";
import { priceCart } from "../domain/commerce";
import { canTransitionOrderStatus } from "../domain/orderState";
import { recordAudit, requireBusinessAccess } from "../domain/tenant";
import { enforceActionRateLimit } from "../domain/rateLimit";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { requirePlanFeature } from "../billing/plans";

const businessScope = z.object({ businessId: z.number().int().positive() });
const cartItemSchema = z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(99) });
const orderStatus = z.enum(["new", "confirmed", "preparing", "ready", "completed", "cancelled"]);

function buildOrderNumber() {
  return `CB974-${nanoid(7).toUpperCase()}`;
}

async function createOrderFromPublicCheckout(input: {
  slug: string;
  cart: z.infer<typeof cartItemSchema>[];
  customer: { firstName: string; lastName: string; email: string; phone?: string | null };
  note?: string | null;
}) {
  const { getRequiredDb } = await import("../domain/tenant");
  const { businesses } = await import("../../drizzle/schema");
  const db = await getRequiredDb();
  const business = await db.select().from(businesses).where(and(eq(businesses.slug, input.slug), eq(businesses.isPublished, true), eq(businesses.status, "active"))).limit(1);
  if (!business[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Cette boutique est indisponible." });
  await requirePlanFeature(business[0].id, "orders");
  const pricing = await priceCart(business[0].id, input.cart);

  let orderId = 0;
  let orderNumber = "";
  await db.transaction(async tx => {
    const normalizedEmail = input.customer.email.trim().toLowerCase();
    await tx
      .insert(customers)
      .values({
        businessId: business[0].id,
        firstName: input.customer.firstName.trim(),
        lastName: input.customer.lastName.trim(),
        email: normalizedEmail,
        phone: input.customer.phone?.trim() || null,
      })
      .onDuplicateKeyUpdate({ set: { firstName: input.customer.firstName.trim(), lastName: input.customer.lastName.trim(), phone: input.customer.phone?.trim() || null } });
    const customer = await tx.select().from(customers).where(and(eq(customers.businessId, business[0].id), eq(customers.email, normalizedEmail))).limit(1);
    if (!customer[0]) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Création client impossible." });
    orderNumber = buildOrderNumber();
    const [created] = await tx.insert(orders).values({
      businessId: business[0].id,
      customerId: customer[0].id,
      orderNumber,
      status: "new",
      subtotalCents: pricing.subtotalCents,
      discountCents: pricing.discountCents,
      totalCents: pricing.totalCents,
      customerNote: input.note?.trim() || null,
      source: "public_shop",
    });
    orderId = Number(created.insertId);
    await tx.insert(orderItems).values(
      pricing.lines.map(line => ({
        orderId,
        productId: line.product.id,
        productName: line.product.name,
        unitPriceCents: line.unitPriceCents,
        quantity: line.quantity,
        lineTotalCents: line.lineTotalCents,
      }))
    );
    await tx.insert(orderStatusHistory).values({ orderId, fromStatus: null, toStatus: "new", note: "Commande créée depuis la boutique publique." });
    for (const line of pricing.lines.filter(line => line.product.trackInventory)) {
      await tx
        .update(products)
        .set({ stockQuantity: sql`${products.stockQuantity} - ${line.quantity}` })
        .where(and(eq(products.id, line.product.id), eq(products.businessId, business[0].id), gte(products.stockQuantity, line.quantity)));
    }
    await tx
      .update(customers)
      .set({ orderCount: sql`${customers.orderCount} + 1`, lifetimeValueCents: sql`${customers.lifetimeValueCents} + ${pricing.totalCents}` })
      .where(eq(customers.id, customer[0].id));
  });
  await recordAudit(business[0].id, null, "order.public_created", "order", orderId, { orderNumber, totalCents: pricing.totalCents });
  return { orderNumber, totalCents: pricing.totalCents };
}

export const customerRouter = router({
  list: protectedProcedure
    .input(businessScope.extend({ query: z.string().max(120).optional(), page: z.number().int().min(1).default(1) }))
    .query(async ({ ctx, input }) => {
      await requirePlanFeature(input.businessId, "orders");
      const { db } = await requireBusinessAccess(ctx.user.id, input.businessId);
      const filters = [eq(customers.businessId, input.businessId)];
      if (input.query) filters.push(or(like(customers.firstName, `%${input.query}%`), like(customers.lastName, `%${input.query}%`), like(customers.email, `%${input.query}%`))!);
      return db.select().from(customers).where(and(...filters)).orderBy(desc(customers.updatedAt)).limit(30).offset((input.page - 1) * 30);
    }),
  get: protectedProcedure.input(businessScope.extend({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
    await requirePlanFeature(input.businessId, "orders");
    const { db } = await requireBusinessAccess(ctx.user.id, input.businessId);
    const customer = await db.select().from(customers).where(and(eq(customers.id, input.id), eq(customers.businessId, input.businessId))).limit(1);
    if (!customer[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Client introuvable." });
    const customerOrders = await db.select().from(orders).where(and(eq(orders.customerId, input.id), eq(orders.businessId, input.businessId))).orderBy(desc(orders.createdAt));
    return { customer: customer[0], orders: customerOrders };
  }),
  update: protectedProcedure
    .input(businessScope.extend({ id: z.number().int().positive(), firstName: z.string().min(1).max(100).optional(), lastName: z.string().min(1).max(100).optional(), phone: z.string().max(32).nullable().optional(), notes: z.string().max(3000).nullable().optional() }))
    .mutation(async ({ ctx, input }) => {
      await enforceActionRateLimit("customer.mutation", `user:${ctx.user.id}:business:${input.businessId}`);
      await requirePlanFeature(input.businessId, "orders");
      const { db } = await requireBusinessAccess(ctx.user.id, input.businessId, ["owner", "manager"]);
      const { businessId, id, ...values } = input;
      await db.update(customers).set(values).where(and(eq(customers.id, id), eq(customers.businessId, businessId)));
      await recordAudit(businessId, ctx.user.id, "customer.updated", "customer", id);
      return { success: true };
    }),
});

export const orderRouter = router({
  list: protectedProcedure
    .input(businessScope.extend({ status: orderStatus.optional(), page: z.number().int().min(1).default(1) }))
    .query(async ({ ctx, input }) => {
      await requirePlanFeature(input.businessId, "orders");
      const { db } = await requireBusinessAccess(ctx.user.id, input.businessId);
      const filters = [eq(orders.businessId, input.businessId)];
      if (input.status) filters.push(eq(orders.status, input.status));
      return db
        .select({ order: orders, customer: customers })
        .from(orders)
        .innerJoin(customers, eq(orders.customerId, customers.id))
        .where(and(...filters))
        .orderBy(desc(orders.createdAt))
        .limit(30)
        .offset((input.page - 1) * 30);
    }),
  get: protectedProcedure.input(businessScope.extend({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
    await requirePlanFeature(input.businessId, "orders");
    const { db } = await requireBusinessAccess(ctx.user.id, input.businessId);
    const order = await db.select({ order: orders, customer: customers }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).where(and(eq(orders.id, input.id), eq(orders.businessId, input.businessId))).limit(1);
    if (!order[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Commande introuvable." });
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, input.id));
    const history = await db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, input.id)).orderBy(desc(orderStatusHistory.createdAt));
    return { ...order[0], items, history };
  }),
  updateStatus: protectedProcedure.input(businessScope.extend({ id: z.number().int().positive(), status: orderStatus, note: z.string().max(600).nullable().optional() })).mutation(async ({ ctx, input }) => {
    await enforceActionRateLimit("order.status", `user:${ctx.user.id}:business:${input.businessId}`);
    await requirePlanFeature(input.businessId, "orders");
    const { db } = await requireBusinessAccess(ctx.user.id, input.businessId, ["owner", "manager", "staff"]);
    const existing = await db.select().from(orders).where(and(eq(orders.id, input.id), eq(orders.businessId, input.businessId))).limit(1);
    if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Commande introuvable." });
    if (!canTransitionOrderStatus(existing[0].status, input.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "Cette transition de statut n’est pas autorisée." });
    await db.transaction(async tx => {
      await tx.update(orders).set({ status: input.status }).where(eq(orders.id, input.id));
      await tx.insert(orderStatusHistory).values({ orderId: input.id, fromStatus: existing[0].status, toStatus: input.status, changedByUserId: ctx.user.id, note: input.note ?? null });
    });
    await recordAudit(input.businessId, ctx.user.id, "order.status_updated", "order", input.id, { from: existing[0].status, to: input.status });
    return { success: true };
  }),
});

export const checkoutRouter = router({
  quote: publicProcedure.input(z.object({ slug: z.string().min(2).max(120), cart: z.array(cartItemSchema).min(1).max(50) })).query(async ({ input }) => {
    const { getRequiredDb } = await import("../domain/tenant");
    const { businesses } = await import("../../drizzle/schema");
    const db = await getRequiredDb();
    const business = await db.select().from(businesses).where(and(eq(businesses.slug, input.slug), eq(businesses.isPublished, true), eq(businesses.status, "active"))).limit(1);
    if (!business[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Boutique introuvable." });
    await requirePlanFeature(business[0].id, "orders");
    const pricing = await priceCart(business[0].id, input.cart);
    return { subtotalCents: pricing.subtotalCents, discountCents: pricing.discountCents, totalCents: pricing.totalCents, lines: pricing.lines.map(line => ({ productId: line.product.id, name: line.product.name, quantity: line.quantity, unitPriceCents: line.unitPriceCents, lineTotalCents: line.lineTotalCents })) };
  }),
  create: publicProcedure.input(z.object({ slug: z.string().min(2).max(120), cart: z.array(cartItemSchema).min(1).max(50), customer: z.object({ firstName: z.string().min(1).max(100), lastName: z.string().min(1).max(100), email: z.string().email(), phone: z.string().max(32).nullable().optional() }), note: z.string().max(1000).nullable().optional() })).mutation(async ({ input, ctx }) => {
    await enforceActionRateLimit("checkout.create", `ip:${ctx.req.ip || "unknown"}`);
    return createOrderFromPublicCheckout(input);
  }),
});
