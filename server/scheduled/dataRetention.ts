import type { Request, Response } from "express";
import { lt } from "drizzle-orm";
import { aiGenerations, auditLogs, notifications, rateLimitBuckets, stripeWebhookEvents } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { sdk } from "../_core/sdk";
import { getRequiredDb } from "../domain/tenant";
import { logOperationalError } from "../domain/observability";

export function retentionCutoff(now = new Date(), configuredDays = ENV.dataRetentionDays) {
  const days = Number.isFinite(configuredDays) ? Math.max(30, Math.min(3_650, configuredDays)) : 365;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

/** Project-level cron: never deletes orders/customers because their legal retention depends on each merchant. */
export async function dataRetentionHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const db = await getRequiredDb(); const now = new Date(); const cutoff = retentionCutoff(now);
    await db.transaction(async tx => {
      await tx.delete(rateLimitBuckets).where(lt(rateLimitBuckets.expiresAt, now));
      await tx.delete(auditLogs).where(lt(auditLogs.createdAt, cutoff));
      await tx.delete(aiGenerations).where(lt(aiGenerations.createdAt, cutoff));
      await tx.delete(notifications).where(lt(notifications.createdAt, cutoff));
      await tx.delete(stripeWebhookEvents).where(lt(stripeWebhookEvents.receivedAt, cutoff));
    });
    return res.json({ ok: true, retainedFrom: cutoff.toISOString(), taskUid: user.taskUid });
  } catch (error) {
    logOperationalError("scheduled.data_retention.failed", error, { path: req.path });
    return res.status(500).json({ error: "Traitement de conservation interrompu.", timestamp: new Date().toISOString() });
  }
}
