import type { Request, Response } from "express";
import { and, eq, gte, sql } from "drizzle-orm";
import { automationRules, memberships, notifications, orders } from "../../drizzle/schema";
import { getRequiredDb } from "../domain/tenant";
import { sdk } from "../_core/sdk";
import { logOperationalError } from "../domain/observability";

export async function weeklySummaryHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const db = await getRequiredDb();
    if (!db) throw new Error("Base de données indisponible");
    const [rule] = await db.select().from(automationRules).where(eq(automationRules.scheduleCronTaskUid, user.taskUid)).limit(1);
    if (!rule || !rule.isEnabled) return res.json({ ok: true, skipped: "orphan-or-disabled" });
    if (rule.lastRunAt && Date.now() - rule.lastRunAt.getTime() < 20 * 60 * 60 * 1000) return res.json({ ok: true, skipped: "already-processed" });
    const since = new Date(); since.setDate(since.getDate() - 7);
    const [summary] = await db.select({ total: sql<number>`count(*)`, revenue: sql<number>`coalesce(sum(${orders.totalCents}), 0)` }).from(orders).where(and(eq(orders.businessId, rule.businessId), gte(orders.createdAt, since), sql`${orders.status} <> 'cancelled'`));
    const [owner] = await db.select({ userId: memberships.userId }).from(memberships).where(and(eq(memberships.businessId, rule.businessId), eq(memberships.role, "owner"), eq(memberships.status, "active"))).limit(1);
    await db.transaction(async tx => {
      await tx.insert(notifications).values({ businessId: rule.businessId, recipientUserId: owner?.userId ?? null, type: "weekly_summary", title: "Votre point hebdomadaire est prêt", body: `${summary?.total ?? 0} commande(s) et ${Math.round((summary?.revenue ?? 0) / 100)} € observés sur les 7 derniers jours.`, actionUrl: "/app" });
      await tx.update(automationRules).set({ lastRunAt: new Date() }).where(eq(automationRules.id, rule.id));
    });
    return res.json({ ok: true, orders: summary?.total ?? 0 });
  } catch (error) {
    logOperationalError("scheduled.weekly_summary.failed", error, { path: req.path });
    return res.status(500).json({ error: "Traitement planifié interrompu.", timestamp: new Date().toISOString() });
  }
}
