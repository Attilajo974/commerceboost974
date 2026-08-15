import { and, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { customers, orderItems, orders, products, promotions } from "../../drizzle/schema";
import { requireBusinessAccess } from "../domain/tenant";
import { protectedProcedure, router } from "../_core/trpc";
import { requirePlanFeature } from "../billing/plans";

const periodMap = { today: 1, "7d": 7, "30d": 30, "90d": 90 } as const;

export const analyticsRouter = router({
  overview: protectedProcedure.input(z.object({ businessId: z.number().int().positive(), period: z.enum(["today", "7d", "30d", "90d"]).default("30d") })).query(async ({ ctx, input }) => {
    await requirePlanFeature(input.businessId, "analytics");
    const { db } = await requireBusinessAccess(ctx.user.id, input.businessId);
    const days = periodMap[input.period];
    const from = new Date();
    from.setDate(from.getDate() - days);
    const completedStatuses: ReadonlySet<string> = new Set(["confirmed", "preparing", "ready", "completed"]);
    const recentOrders = await db.select().from(orders).where(and(eq(orders.businessId, input.businessId), gte(orders.createdAt, from))).orderBy(desc(orders.createdAt));
    const revenueCents = recentOrders.filter(order => completedStatuses.has(order.status)).reduce((sum, order) => sum + order.totalCents, 0);
    const activeProducts = await db.select({ count: sql<number>`count(*)` }).from(products).where(and(eq(products.businessId, input.businessId), eq(products.status, "active")));
    const customerCount = await db.select({ count: sql<number>`count(*)` }).from(customers).where(eq(customers.businessId, input.businessId));
    const activePromotions = await db.select({ count: sql<number>`count(*)` }).from(promotions).where(and(eq(promotions.businessId, input.businessId), eq(promotions.isActive, true)));
    const popularProducts = await db
      .select({ productName: orderItems.productName, quantity: sql<number>`sum(${orderItems.quantity})`, revenueCents: sql<number>`sum(${orderItems.lineTotalCents})` })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(eq(orders.businessId, input.businessId), gte(orders.createdAt, from)))
      .groupBy(orderItems.productName)
      .orderBy(desc(sql`sum(${orderItems.quantity})`))
      .limit(5);
    const daily = [...Array(days)].map((_, index) => {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - (days - 1 - index));
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      const ordersOnDay = recentOrders.filter(order => order.createdAt >= day && order.createdAt < next && completedStatuses.has(order.status));
      return { date: day.toISOString().slice(0, 10), revenueCents: ordersOnDay.reduce((sum, order) => sum + order.totalCents, 0), orderCount: ordersOnDay.length };
    });
    const actions = [] as { title: string; detail: string; tone: "info" | "success" | "warning" }[];
    if (activeProducts[0]?.count === 0) actions.push({ title: "Ajoutez votre premier produit", detail: "Votre boutique a besoin d’au moins un produit actif pour recevoir des commandes.", tone: "warning" });
    if (recentOrders.filter(order => order.status === "new").length) actions.push({ title: "Nouvelles commandes à traiter", detail: `${recentOrders.filter(order => order.status === "new").length} commande(s) attendent une confirmation.`, tone: "info" });
    if (!actions.length) actions.push({ title: "Votre activité est à jour", detail: "Continuez à mettre en avant vos produits les plus demandés.", tone: "success" });
    return { period: input.period, revenueCents, orderCount: recentOrders.length, activeProductCount: Number(activeProducts[0]?.count ?? 0), customerCount: Number(customerCount[0]?.count ?? 0), activePromotionCount: Number(activePromotions[0]?.count ?? 0), recentOrders: recentOrders.slice(0, 6), popularProducts, daily, actions };
  }),
});
