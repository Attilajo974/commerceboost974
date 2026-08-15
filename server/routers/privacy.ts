import { eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { accountDeletionMarkers, aiGenerations, auditLogs, automationRules, businesses, businessSettings, categories, customers, memberships, notifications, orderItems, orders, products, promotions, subscriptions, users } from "../../drizzle/schema";
import { enforceActionRateLimit } from "../domain/rateLimit";
import { getRequiredDb, recordAudit, requireBusinessAccess } from "../domain/tenant";
import { protectedProcedure, router } from "../_core/trpc";

const workspace = z.object({ businessId: z.number().int().positive() });

export const privacyRouter = router({
  exportWorkspace: protectedProcedure.input(workspace).query(async ({ ctx, input }) => {
    const { db } = await requireBusinessAccess(ctx.user.id, input.businessId, ["owner"]);
    await enforceActionRateLimit("privacy.export", `user:${ctx.user.id}:business:${input.businessId}`);
    const [business] = await db.select().from(businesses).where(eq(businesses.id, input.businessId)).limit(1);
    if (!business) throw new TRPCError({ code: "NOT_FOUND", message: "Entreprise introuvable." });
    const customerRows = await db.select().from(customers).where(eq(customers.businessId, input.businessId)); const orderRows = await db.select().from(orders).where(eq(orders.businessId, input.businessId)); const orderIds = orderRows.map(order => order.id);
    const items = orderIds.length ? await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)) : [];
    await recordAudit(input.businessId, ctx.user.id, "privacy.workspace_exported", "business", input.businessId);
    return { exportedAt: new Date().toISOString(), format: "json", business, settings: await db.select().from(businessSettings).where(eq(businessSettings.businessId, input.businessId)), categories: await db.select().from(categories).where(eq(categories.businessId, input.businessId)), products: await db.select().from(products).where(eq(products.businessId, input.businessId)), promotions: await db.select().from(promotions).where(eq(promotions.businessId, input.businessId)), customers: customerRows, orders: orderRows, orderItems: items, automations: await db.select().from(automationRules).where(eq(automationRules.businessId, input.businessId)), subscription: await db.select().from(subscriptions).where(eq(subscriptions.businessId, input.businessId)), aiUsage: await db.select({ id: aiGenerations.id, feature: aiGenerations.feature, status: aiGenerations.status, createdAt: aiGenerations.createdAt }).from(aiGenerations).where(eq(aiGenerations.businessId, input.businessId)), notifications: await db.select().from(notifications).where(eq(notifications.businessId, input.businessId)), audit: await db.select().from(auditLogs).where(eq(auditLogs.businessId, input.businessId)) };
  }),
  deleteWorkspace: protectedProcedure.input(workspace.extend({ confirmation: z.string().min(1).max(160) })).mutation(async ({ ctx, input }) => {
    await enforceActionRateLimit("privacy.delete", `user:${ctx.user.id}:business:${input.businessId}`); const { db } = await requireBusinessAccess(ctx.user.id, input.businessId, ["owner"]);
    const [business] = await db.select({ name: businesses.name }).from(businesses).where(eq(businesses.id, input.businessId)).limit(1); if (!business) throw new TRPCError({ code: "NOT_FOUND", message: "Entreprise introuvable." }); if (input.confirmation.trim() !== business.name) throw new TRPCError({ code: "BAD_REQUEST", message: "Saisissez exactement le nom de l’entreprise pour confirmer sa suppression." });
    await recordAudit(input.businessId, ctx.user.id, "privacy.workspace_deleted", "business", input.businessId); await db.delete(businesses).where(eq(businesses.id, input.businessId)); return { success: true };
  }),
  deleteMyAccount: protectedProcedure.input(z.object({ confirmation: z.literal("SUPPRIMER MON COMPTE") })).mutation(async ({ ctx }) => {
    await enforceActionRateLimit("privacy.delete", `user:${ctx.user.id}`); const db = await getRequiredDb();
    const membershipsCount = await db.select({ id: memberships.id }).from(memberships).where(eq(memberships.userId, ctx.user.id)).limit(1); if (membershipsCount[0]) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Supprimez ou transférez d’abord vos espaces professionnels avant de supprimer votre compte." });
    await db.transaction(async tx => { await tx.insert(accountDeletionMarkers).values({ openId: ctx.user.openId }); await tx.delete(users).where(eq(users.id, ctx.user.id)); }); return { success: true };
  }),
});
