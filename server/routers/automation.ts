import { and, desc, eq } from "drizzle-orm";
import { parse as parseCookie } from "cookie";
import { z } from "zod";
import { automationRules } from "../../drizzle/schema";
import { COOKIE_NAME } from "../../shared/const";
import { createHeartbeatJob, deleteHeartbeatJob, updateHeartbeatJob } from "../_core/heartbeat";
import { enforceActionRateLimit } from "../domain/rateLimit";
import { recordAudit, requireBusinessAccess } from "../domain/tenant";
import { protectedProcedure, router } from "../_core/trpc";

const scope = z.object({ businessId: z.number().int().positive() });
const weeklyCron = "0 0 5 * * 1";

function sessionToken(cookieHeader: string | undefined) { return parseCookie(cookieHeader ?? "")[COOKIE_NAME] ?? ""; }

export const automationRouter = router({
  list: protectedProcedure.input(scope).query(async ({ ctx, input }) => {
    const { db } = await requireBusinessAccess(ctx.user.id, input.businessId);
    return db.select().from(automationRules).where(eq(automationRules.businessId, input.businessId)).orderBy(desc(automationRules.createdAt));
  }),
  createWeeklySummary: protectedProcedure.input(scope.extend({ name: z.string().min(3).max(120).default("Point hebdomadaire") })).mutation(async ({ ctx, input }) => {
    await enforceActionRateLimit("automation.mutation", `user:${ctx.user.id}:business:${input.businessId}`);
    const { db } = await requireBusinessAccess(ctx.user.id, input.businessId, ["owner"]);
    const job = await createHeartbeatJob({ name: `commerceboost-weekly-${input.businessId}-${Date.now()}`, cron: weeklyCron, path: "/api/scheduled/weekly-summary", payload: {}, description: `Résumé hebdomadaire CommerceBoost974 pour l’entreprise ${input.businessId}` }, sessionToken(ctx.req.headers.cookie));
    const [created] = await db.insert(automationRules).values({ businessId: input.businessId, name: input.name.trim(), triggerType: "scheduled", triggerConfig: { cron: weeklyCron, timezone: "UTC", cadence: "hebdomadaire" }, actionType: "weekly_summary_notification", actionConfig: { target: "owner" }, scheduleCronTaskUid: job.taskUid, isEnabled: true });
    const id = Number(created.insertId);
    await recordAudit(input.businessId, ctx.user.id, "automation.created", "automation_rule", id, { kind: "weekly_summary" });
    return { id, nextExecutionAt: job.nextExecutionAt ?? null };
  }),
  toggle: protectedProcedure.input(scope.extend({ id: z.number().int().positive(), isEnabled: z.boolean() })).mutation(async ({ ctx, input }) => {
    await enforceActionRateLimit("automation.mutation", `user:${ctx.user.id}:business:${input.businessId}`);
    const { db } = await requireBusinessAccess(ctx.user.id, input.businessId, ["owner"]);
    const [rule] = await db.select().from(automationRules).where(and(eq(automationRules.id, input.id), eq(automationRules.businessId, input.businessId))).limit(1);
    if (!rule) throw new Error("Règle introuvable.");
    if (rule.scheduleCronTaskUid) await updateHeartbeatJob(rule.scheduleCronTaskUid, { enable: input.isEnabled }, sessionToken(ctx.req.headers.cookie));
    await db.update(automationRules).set({ isEnabled: input.isEnabled }).where(eq(automationRules.id, input.id));
    await recordAudit(input.businessId, ctx.user.id, "automation.toggled", "automation_rule", input.id, { isEnabled: input.isEnabled });
    return { success: true };
  }),
  remove: protectedProcedure.input(scope.extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await enforceActionRateLimit("automation.mutation", `user:${ctx.user.id}:business:${input.businessId}`);
    const { db } = await requireBusinessAccess(ctx.user.id, input.businessId, ["owner"]);
    const [rule] = await db.select().from(automationRules).where(and(eq(automationRules.id, input.id), eq(automationRules.businessId, input.businessId))).limit(1);
    if (!rule) return { success: true };
    if (rule.scheduleCronTaskUid) await deleteHeartbeatJob(rule.scheduleCronTaskUid, sessionToken(ctx.req.headers.cookie));
    await db.delete(automationRules).where(eq(automationRules.id, input.id));
    await recordAudit(input.businessId, ctx.user.id, "automation.deleted", "automation_rule", input.id);
    return { success: true };
  }),
});
