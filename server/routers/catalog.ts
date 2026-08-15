import { and, asc, desc, eq, inArray, like, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { categories, products, promotionProducts, promotions } from "../../drizzle/schema";
import { slugify } from "../domain/slug";
import { recordAudit, requireBusinessAccess } from "../domain/tenant";
import { enforceActionRateLimit } from "../domain/rateLimit";
import { protectedProcedure, router } from "../_core/trpc";

const scope = z.object({ businessId: z.number().int().positive() });
const productStatus = z.enum(["draft", "active", "archived"]);

async function validateCategory(businessId: number, categoryId: number | null | undefined, userId: number) {
  if (!categoryId) return;
  const { db } = await requireBusinessAccess(userId, businessId);
  const category = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.businessId, businessId)))
    .limit(1);
  if (!category[0]) throw new TRPCError({ code: "BAD_REQUEST", message: "La catégorie sélectionnée est introuvable." });
}

async function validatePromotionProducts(businessId: number, productIds: number[], userId: number) {
  if (!productIds.length) return;
  const { db } = await requireBusinessAccess(userId, businessId);
  const scoped = await db.select({ id: products.id }).from(products).where(and(eq(products.businessId, businessId), inArray(products.id, productIds)));
  if (scoped.length !== new Set(productIds).size) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Un produit ciblé est invalide." });
  }
}

export const categoryRouter = router({
  list: protectedProcedure.input(scope).query(async ({ ctx, input }) => {
    const { db } = await requireBusinessAccess(ctx.user.id, input.businessId);
    return db.select().from(categories).where(eq(categories.businessId, input.businessId)).orderBy(asc(categories.sortOrder), asc(categories.name));
  }),
  create: protectedProcedure
    .input(scope.extend({ name: z.string().min(2).max(120), description: z.string().max(2000).nullable().optional(), isActive: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      await enforceActionRateLimit("catalog.mutation", `user:${ctx.user.id}:business:${input.businessId}`);
      const { db } = await requireBusinessAccess(ctx.user.id, input.businessId, ["owner", "manager"]);
      const existing = await db.select({ id: categories.id }).from(categories).where(eq(categories.businessId, input.businessId));
      const slug = slugify(input.name);
      const [created] = await db.insert(categories).values({
        businessId: input.businessId,
        name: input.name.trim(),
        slug: `${slug}-${existing.length + 1}`,
        description: input.description ?? null,
        sortOrder: existing.length,
        isActive: input.isActive ?? true,
      });
      const id = Number(created.insertId);
      await recordAudit(input.businessId, ctx.user.id, "category.created", "category", id);
      return { id };
    }),
  update: protectedProcedure
    .input(scope.extend({ id: z.number().int().positive(), name: z.string().min(2).max(120).optional(), description: z.string().max(2000).nullable().optional(), sortOrder: z.number().int().min(0).optional(), isActive: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      await enforceActionRateLimit("catalog.mutation", `user:${ctx.user.id}:business:${input.businessId}`);
      const { db } = await requireBusinessAccess(ctx.user.id, input.businessId, ["owner", "manager"]);
      const { businessId, id, ...values } = input;
      const found = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.id, id), eq(categories.businessId, businessId))).limit(1);
      if (!found[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Catégorie introuvable." });
      await db.update(categories).set(values).where(eq(categories.id, id));
      await recordAudit(businessId, ctx.user.id, "category.updated", "category", id);
      return { success: true };
    }),
  remove: protectedProcedure.input(scope.extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await enforceActionRateLimit("catalog.mutation", `user:${ctx.user.id}:business:${input.businessId}`);
    const { db } = await requireBusinessAccess(ctx.user.id, input.businessId, ["owner", "manager"]);
    await db.delete(categories).where(and(eq(categories.id, input.id), eq(categories.businessId, input.businessId)));
    await recordAudit(input.businessId, ctx.user.id, "category.deleted", "category", input.id);
    return { success: true };
  }),
});

export const productRouter = router({
  list: protectedProcedure
    .input(scope.extend({ query: z.string().max(120).optional(), status: productStatus.optional(), categoryId: z.number().int().positive().optional(), sort: z.enum(["recent", "price_asc", "price_desc", "name"]).default("recent") }))
    .query(async ({ ctx, input }) => {
      const { db } = await requireBusinessAccess(ctx.user.id, input.businessId);
      const filters = [eq(products.businessId, input.businessId)];
      if (input.status) filters.push(eq(products.status, input.status));
      if (input.categoryId) filters.push(eq(products.categoryId, input.categoryId));
      if (input.query) filters.push(or(like(products.name, `%${input.query}%`), like(products.sku, `%${input.query}%`))!);
      const ordering = input.sort === "price_asc" ? asc(products.priceCents) : input.sort === "price_desc" ? desc(products.priceCents) : input.sort === "name" ? asc(products.name) : desc(products.updatedAt);
      return db.select({ product: products, category: categories }).from(products).leftJoin(categories, eq(products.categoryId, categories.id)).where(and(...filters)).orderBy(ordering);
    }),
  create: protectedProcedure
    .input(scope.extend({ name: z.string().min(2).max(180), description: z.string().max(6000).nullable().optional(), shortDescription: z.string().max(320).nullable().optional(), sku: z.string().max(80).nullable().optional(), priceCents: z.number().int().min(0), compareAtPriceCents: z.number().int().min(0).nullable().optional(), categoryId: z.number().int().positive().nullable().optional(), imageUrl: z.string().url().nullable().optional(), status: productStatus.optional(), isAvailable: z.boolean().optional(), trackInventory: z.boolean().optional(), stockQuantity: z.number().int().min(0).nullable().optional() }))
    .mutation(async ({ ctx, input }) => {
      await enforceActionRateLimit("catalog.mutation", `user:${ctx.user.id}:business:${input.businessId}`);
      const { db } = await requireBusinessAccess(ctx.user.id, input.businessId, ["owner", "manager"]);
      await validateCategory(input.businessId, input.categoryId, ctx.user.id);
      const slug = `${slugify(input.name)}-${Date.now().toString(36)}`;
      const [created] = await db.insert(products).values({ ...input, slug, name: input.name.trim(), status: input.status ?? "draft", isAvailable: input.isAvailable ?? true, trackInventory: input.trackInventory ?? false });
      const id = Number(created.insertId);
      await recordAudit(input.businessId, ctx.user.id, "product.created", "product", id);
      return { id };
    }),
  update: protectedProcedure
    .input(scope.extend({ id: z.number().int().positive(), name: z.string().min(2).max(180).optional(), description: z.string().max(6000).nullable().optional(), shortDescription: z.string().max(320).nullable().optional(), sku: z.string().max(80).nullable().optional(), priceCents: z.number().int().min(0).optional(), compareAtPriceCents: z.number().int().min(0).nullable().optional(), categoryId: z.number().int().positive().nullable().optional(), imageUrl: z.string().url().nullable().optional(), status: productStatus.optional(), isAvailable: z.boolean().optional(), trackInventory: z.boolean().optional(), stockQuantity: z.number().int().min(0).nullable().optional() }))
    .mutation(async ({ ctx, input }) => {
      await enforceActionRateLimit("catalog.mutation", `user:${ctx.user.id}:business:${input.businessId}`);
      const { db } = await requireBusinessAccess(ctx.user.id, input.businessId, ["owner", "manager"]);
      await validateCategory(input.businessId, input.categoryId, ctx.user.id);
      const { businessId, id, ...values } = input;
      const found = await db.select({ id: products.id }).from(products).where(and(eq(products.id, id), eq(products.businessId, businessId))).limit(1);
      if (!found[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Produit introuvable." });
      await db.update(products).set({ ...values, ...(values.name ? { slug: `${slugify(values.name)}-${id}` } : {}) }).where(eq(products.id, id));
      await recordAudit(businessId, ctx.user.id, "product.updated", "product", id);
      return { success: true };
    }),
  archive: protectedProcedure.input(scope.extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await enforceActionRateLimit("catalog.mutation", `user:${ctx.user.id}:business:${input.businessId}`);
    const { db } = await requireBusinessAccess(ctx.user.id, input.businessId, ["owner", "manager"]);
    await db.update(products).set({ status: "archived", isAvailable: false }).where(and(eq(products.id, input.id), eq(products.businessId, input.businessId)));
    await recordAudit(input.businessId, ctx.user.id, "product.archived", "product", input.id);
    return { success: true };
  }),
  remove: protectedProcedure.input(scope.extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await enforceActionRateLimit("catalog.mutation", `user:${ctx.user.id}:business:${input.businessId}`);
    const { db } = await requireBusinessAccess(ctx.user.id, input.businessId, ["owner", "manager"]);
    const result = await db.delete(products).where(and(eq(products.id, input.id), eq(products.businessId, input.businessId)));
    if (!result[0]?.affectedRows) throw new TRPCError({ code: "NOT_FOUND", message: "Produit introuvable." });
    await recordAudit(input.businessId, ctx.user.id, "product.deleted", "product", input.id);
    return { success: true };
  }),
});

export const promotionRouter = router({
  list: protectedProcedure.input(scope).query(async ({ ctx, input }) => {
    const { db } = await requireBusinessAccess(ctx.user.id, input.businessId);
    return db.select().from(promotions).where(eq(promotions.businessId, input.businessId)).orderBy(desc(promotions.createdAt));
  }),
  create: protectedProcedure
    .input(scope.extend({ name: z.string().min(2).max(160), code: z.string().min(3).max(64).nullable().optional(), discountType: z.enum(["percentage", "fixed"]), discountValue: z.number().int().positive(), minimumOrderCents: z.number().int().min(0).nullable().optional(), startsAt: z.date().nullable().optional(), endsAt: z.date().nullable().optional(), isActive: z.boolean().optional(), appliesToAll: z.boolean().optional(), productIds: z.array(z.number().int().positive()).max(100).default([]) }))
    .mutation(async ({ ctx, input }) => {
      await enforceActionRateLimit("promotion.mutation", `user:${ctx.user.id}:business:${input.businessId}`);
      const { db } = await requireBusinessAccess(ctx.user.id, input.businessId, ["owner", "manager"]);
      if (input.discountType === "percentage" && input.discountValue > 100) throw new TRPCError({ code: "BAD_REQUEST", message: "La réduction ne peut pas dépasser 100 %." });
      if (input.endsAt && input.startsAt && input.endsAt <= input.startsAt) throw new TRPCError({ code: "BAD_REQUEST", message: "La période de promotion est invalide." });
      await validatePromotionProducts(input.businessId, input.productIds, ctx.user.id);
      const [created] = await db.insert(promotions).values({
        businessId: input.businessId,
        name: input.name.trim(),
        code: input.code?.trim().toUpperCase() ?? null,
        discountType: input.discountType,
        discountValue: input.discountValue,
        minimumOrderCents: input.minimumOrderCents ?? null,
        startsAt: input.startsAt ?? null,
        endsAt: input.endsAt ?? null,
        isActive: input.isActive ?? true,
        appliesToAll: input.appliesToAll ?? input.productIds.length === 0,
      });
      const promotionId = Number(created.insertId);
      if (input.productIds.length) {
        await db.insert(promotionProducts).values(input.productIds.map(productId => ({ promotionId, productId })));
      }
      await recordAudit(input.businessId, ctx.user.id, "promotion.created", "promotion", promotionId);
      return { id: promotionId };
    }),
  get: protectedProcedure.input(scope.extend({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const { db } = await requireBusinessAccess(ctx.user.id, input.businessId);
    const promotion = await db.select().from(promotions).where(and(eq(promotions.id, input.id), eq(promotions.businessId, input.businessId))).limit(1);
    if (!promotion[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Promotion introuvable." });
    const targets = await db.select({ productId: promotionProducts.productId }).from(promotionProducts).where(eq(promotionProducts.promotionId, input.id));
    return { promotion: promotion[0], productIds: targets.map(target => target.productId) };
  }),
  update: protectedProcedure
    .input(scope.extend({ id: z.number().int().positive(), name: z.string().min(2).max(160).optional(), code: z.string().min(3).max(64).nullable().optional(), discountType: z.enum(["percentage", "fixed"]).optional(), discountValue: z.number().int().positive().optional(), minimumOrderCents: z.number().int().min(0).nullable().optional(), startsAt: z.date().nullable().optional(), endsAt: z.date().nullable().optional(), isActive: z.boolean().optional(), appliesToAll: z.boolean().optional(), productIds: z.array(z.number().int().positive()).max(100).optional() }))
    .mutation(async ({ ctx, input }) => {
      await enforceActionRateLimit("promotion.mutation", `user:${ctx.user.id}:business:${input.businessId}`);
      const { db } = await requireBusinessAccess(ctx.user.id, input.businessId, ["owner", "manager"]);
      const existing = await db.select().from(promotions).where(and(eq(promotions.id, input.id), eq(promotions.businessId, input.businessId))).limit(1);
      if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Promotion introuvable." });
      const nextType = input.discountType ?? existing[0].discountType;
      const nextValue = input.discountValue ?? existing[0].discountValue;
      if (nextType === "percentage" && nextValue > 100) throw new TRPCError({ code: "BAD_REQUEST", message: "La réduction ne peut pas dépasser 100 %." });
      const nextStartsAt = input.startsAt === undefined ? existing[0].startsAt : input.startsAt;
      const nextEndsAt = input.endsAt === undefined ? existing[0].endsAt : input.endsAt;
      if (nextStartsAt && nextEndsAt && nextEndsAt <= nextStartsAt) throw new TRPCError({ code: "BAD_REQUEST", message: "La période de promotion est invalide." });
      if (input.productIds) await validatePromotionProducts(input.businessId, input.productIds, ctx.user.id);
      const { businessId, id, productIds, ...values } = input;
      await db.transaction(async tx => {
        await tx.update(promotions).set({ ...values, ...(values.code !== undefined ? { code: values.code?.trim().toUpperCase() ?? null } : {}) }).where(eq(promotions.id, id));
        if (productIds) {
          await tx.delete(promotionProducts).where(eq(promotionProducts.promotionId, id));
          if (productIds.length) await tx.insert(promotionProducts).values(productIds.map(productId => ({ promotionId: id, productId })));
        }
      });
      await recordAudit(businessId, ctx.user.id, "promotion.updated", "promotion", id);
      return { success: true };
    }),
  remove: protectedProcedure.input(scope.extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await enforceActionRateLimit("promotion.mutation", `user:${ctx.user.id}:business:${input.businessId}`);
    const { db } = await requireBusinessAccess(ctx.user.id, input.businessId, ["owner", "manager"]);
    await db.delete(promotions).where(and(eq(promotions.id, input.id), eq(promotions.businessId, input.businessId)));
    await recordAudit(input.businessId, ctx.user.id, "promotion.deleted", "promotion", input.id);
    return { success: true };
  }),
  toggle: protectedProcedure.input(scope.extend({ id: z.number().int().positive(), isActive: z.boolean() })).mutation(async ({ ctx, input }) => {
    await enforceActionRateLimit("promotion.mutation", `user:${ctx.user.id}:business:${input.businessId}`);
    const { db } = await requireBusinessAccess(ctx.user.id, input.businessId, ["owner", "manager"]);
    await db.update(promotions).set({ isActive: input.isActive }).where(and(eq(promotions.id, input.id), eq(promotions.businessId, input.businessId)));
    await recordAudit(input.businessId, ctx.user.id, "promotion.toggled", "promotion", input.id, { isActive: input.isActive });
    return { success: true };
  }),
});
