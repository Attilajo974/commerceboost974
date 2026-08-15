import { createHash } from "crypto";
import { and, eq, lt, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { rateLimitBuckets } from "../../drizzle/schema";
import { getRequiredDb } from "./tenant";

export const ACTION_RATE_POLICIES = {
  "business.create": { limit: 4, windowMs: 60 * 60 * 1000 },
  "business.publish": { limit: 12, windowMs: 60 * 60 * 1000 },
  "business.settings": { limit: 30, windowMs: 60 * 60 * 1000 },
  "business.profile": { limit: 100, windowMs: 60 * 60 * 1000 },
  "business.onboarding": { limit: 30, windowMs: 60 * 60 * 1000 },
  "catalog.mutation": { limit: 100, windowMs: 60 * 60 * 1000 },
  "promotion.mutation": { limit: 60, windowMs: 60 * 60 * 1000 },
  "customer.mutation": { limit: 120, windowMs: 60 * 60 * 1000 },
  "order.status": { limit: 120, windowMs: 60 * 60 * 1000 },
  "ai.generation": { limit: 20, windowMs: 60 * 60 * 1000 },
  "automation.mutation": { limit: 20, windowMs: 60 * 60 * 1000 },
  "checkout.create": { limit: 8, windowMs: 10 * 60 * 1000 },
  "billing.checkout": { limit: 8, windowMs: 60 * 60 * 1000 },
  "billing.portal": { limit: 12, windowMs: 60 * 60 * 1000 },
  "privacy.export": { limit: 8, windowMs: 60 * 60 * 1000 },
  "privacy.delete": { limit: 4, windowMs: 24 * 60 * 60 * 1000 },
} as const;

type ActionName = keyof typeof ACTION_RATE_POLICIES;

export const SENSITIVE_MUTATION_COVERAGE = [
  { procedure: "business.create", policy: "business.create", audit: "business.created" },
  { procedure: "business.updateProfile", policy: "business.profile", audit: "business.updated" },
  { procedure: "business.updateOnboarding", policy: "business.onboarding", audit: "business.onboarding_updated" },
  { procedure: "business.updateSettings", policy: "business.settings", audit: "business.settings_updated" },
  { procedure: "business.publish", policy: "business.publish", audit: "business.published" },
  { procedure: "category.create/update/remove", policy: "catalog.mutation", audit: "category.*" },
  { procedure: "product.create/update/archive/remove", policy: "catalog.mutation", audit: "product.*" },
  { procedure: "promotion.create/update/remove/toggle", policy: "promotion.mutation", audit: "promotion.*" },
  { procedure: "customer.update", policy: "customer.mutation", audit: "customer.updated" },
  { procedure: "order.updateStatus", policy: "order.status", audit: "order.status_updated" },
  { procedure: "ai.improveProduct / ai.weeklyInsight", policy: "ai.generation", audit: "ai.generated" },
  { procedure: "automation.createWeeklySummary / toggle / remove", policy: "automation.mutation", audit: "automation.*" },
  { procedure: "checkout.create", policy: "checkout.create", audit: "order.public_created" },
  { procedure: "billing.createCheckout", policy: "billing.checkout", audit: "billing.checkout_created" },
  { procedure: "billing.portal", policy: "billing.portal", audit: "billing.portal_created" },
  { procedure: "privacy.deleteWorkspace / deleteMyAccount", policy: "privacy.delete", audit: "privacy.*" },
] as const;

export function hashRateLimitSubject(subject: string) {
  return createHash("sha256").update(subject).digest("hex");
}

export function getBucketWindow(now: Date, windowMs: number) {
  const bucketMs = Math.floor(now.getTime() / windowMs) * windowMs;
  return { startedAt: new Date(bucketMs), expiresAt: new Date(bucketMs + windowMs) };
}

export async function enforceActionRateLimit(action: ActionName, subject: string) {
  const policy = ACTION_RATE_POLICIES[action];
  const db = await getRequiredDb();
  const now = new Date();
  const subjectHash = hashRateLimitSubject(subject);
  const bucket = getBucketWindow(now, policy.windowMs);

  // Opportunistic cleanup keeps this shared protection bounded without timers.
  await db.delete(rateLimitBuckets).where(lt(rateLimitBuckets.expiresAt, now));
  await db
    .insert(rateLimitBuckets)
    .values({ subjectHash, action, bucketStartedAt: bucket.startedAt, count: 1, expiresAt: bucket.expiresAt })
    .onDuplicateKeyUpdate({ set: { count: sql`${rateLimitBuckets.count} + 1`, expiresAt: bucket.expiresAt } });
  const counter = await db
    .select({ count: rateLimitBuckets.count })
    .from(rateLimitBuckets)
    .where(and(eq(rateLimitBuckets.subjectHash, subjectHash), eq(rateLimitBuckets.action, action), eq(rateLimitBuckets.bucketStartedAt, bucket.startedAt)))
    .limit(1);

  if ((counter[0]?.count ?? policy.limit + 1) > policy.limit) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Trop d’actions similaires. Réessayez dans quelques instants." });
  }
}
