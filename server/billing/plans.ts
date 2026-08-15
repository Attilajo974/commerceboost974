import { and, count, eq, gte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { aiGenerations, automationRules, products, subscriptionPlans, subscriptions } from "../../drizzle/schema";
import { getRequiredDb } from "../domain/tenant";

export const PLAN_CODES = ["starter", "business", "pro"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];
export type BillableFeature = "public_shop" | "orders" | "analytics" | "ai" | "automations";

export const PLAN_DEFINITIONS: Record<PlanCode, { name: string; description: string; limits: { products: number; aiGenerationsPerMonth: number; automations: number }; features: Record<BillableFeature, boolean> }> = {
  starter: { name: "Starter", description: "Présence en ligne et fonctions essentielles.", limits: { products: 15, aiGenerationsPerMonth: 0, automations: 0 }, features: { public_shop: true, orders: false, analytics: false, ai: false, automations: false } },
  business: { name: "Business", description: "Catalogue, commandes et analyses.", limits: { products: 250, aiGenerationsPerMonth: 0, automations: 0 }, features: { public_shop: true, orders: true, analytics: true, ai: false, automations: false } },
  pro: { name: "Pro", description: "IA et automatisations avancées.", limits: { products: 2_000, aiGenerationsPerMonth: 250, automations: 10 }, features: { public_shop: true, orders: true, analytics: true, ai: true, automations: true } },
};

export function isPlanCode(value: string): value is PlanCode { return PLAN_CODES.includes(value as PlanCode); }
export function configuredStripePriceId(plan: PlanCode) { const key = `STRIPE_PRICE_${plan.toUpperCase()}`; const value = process.env[key]; return value?.startsWith("price_") ? value : null; }
export function stripeReadiness() { const prices = Object.fromEntries(PLAN_CODES.map(plan => [plan, configuredStripePriceId(plan)])) as Record<PlanCode, string | null>; return { configured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && Object.values(prices).every(Boolean)), prices }; }

export async function getBusinessPlan(businessId: number) {
  const db = await getRequiredDb();
  const rows = await db.select({ subscription: subscriptions, plan: subscriptionPlans }).from(subscriptions).leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id)).where(eq(subscriptions.businessId, businessId)).limit(1);
  const code = rows[0]?.plan?.code && isPlanCode(rows[0].plan.code) ? rows[0].plan.code : "starter";
  return { subscription: rows[0]?.subscription ?? null, code, definition: PLAN_DEFINITIONS[code] };
}

export async function requirePlanFeature(businessId: number, feature: BillableFeature) {
  const plan = await getBusinessPlan(businessId);
  if (!plan.definition.features[feature]) throw new TRPCError({ code: "FORBIDDEN", message: `La fonctionnalité « ${feature} » requiert une offre supérieure.` });
  return plan;
}

export async function enforcePlanLimit(businessId: number, limit: "products" | "automations") {
  const plan = await getBusinessPlan(businessId); const db = await getRequiredDb();
  const table = limit === "products" ? products : automationRules;
  const rows = await db.select({ value: count() }).from(table).where(and(eq(table.businessId, businessId), limit === "products" ? eq(products.status, "active") : eq(automationRules.isEnabled, true)));
  if ((rows[0]?.value ?? 0) >= plan.definition.limits[limit]) throw new TRPCError({ code: "FORBIDDEN", message: `La limite de l’offre ${plan.definition.name} est atteinte pour cette ressource.` });
  return plan;
}

export async function enforceAiMonthlyLimit(businessId: number) {
  const plan = await requirePlanFeature(businessId, "ai"); const db = await getRequiredDb(); const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const rows = await db.select({ value: count() }).from(aiGenerations).where(and(eq(aiGenerations.businessId, businessId), eq(aiGenerations.status, "success"), gte(aiGenerations.createdAt, monthStart)));
  if ((rows[0]?.value ?? 0) >= plan.definition.limits.aiGenerationsPerMonth) throw new TRPCError({ code: "FORBIDDEN", message: "La limite mensuelle de générations IA de votre offre est atteinte." });
  return plan;
}
