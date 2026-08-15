import type { Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import Stripe from "stripe";
import { subscriptionPlans, subscriptions, stripeWebhookEvents } from "../../drizzle/schema";
import { isPlanCode, PLAN_DEFINITIONS, stripeReadiness } from "./plans";
import { getRequiredDb, recordAudit } from "../domain/tenant";
import { logOperationalError } from "../domain/observability";

function subscriptionStatus(status: string): "trial" | "active" | "past_due" | "cancelled" {
  if (status === "active") return "active";
  if (status === "trialing") return "trial";
  if (status === "past_due" || status === "unpaid") return "past_due";
  return "cancelled";
}

async function planIdFor(code: string) {
  if (!isPlanCode(code)) return null;
  const db = await getRequiredDb(); const definition = PLAN_DEFINITIONS[code];
  const existing = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.code, code)).limit(1);
  if (existing[0]) return existing[0].id;
  const created = await db.insert(subscriptionPlans).values({ code, name: definition.name, description: definition.description, limits: definition.limits, isActive: true });
  return Number(created[0].insertId);
}

async function syncSubscription(stripeSubscription: Stripe.Subscription, businessId: number, planCode: string) {
  const db = await getRequiredDb(); const planId = await planIdFor(planCode); const priceId = stripeSubscription.items.data[0]?.price.id ?? null;
  const periodEnd = (stripeSubscription as Stripe.Subscription & { current_period_end?: number }).current_period_end;
  const values = { businessId, planId, status: subscriptionStatus(stripeSubscription.status), currentPeriodEndsAt: periodEnd ? new Date(periodEnd * 1000) : null, trialEndsAt: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null, cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end, stripeCustomerId: typeof stripeSubscription.customer === "string" ? stripeSubscription.customer : stripeSubscription.customer.id, stripeSubscriptionId: stripeSubscription.id, stripePriceId: priceId };
  const existing = await db.select().from(subscriptions).where(eq(subscriptions.businessId, businessId)).limit(1);
  if (existing[0]) await db.update(subscriptions).set(values).where(eq(subscriptions.businessId, businessId)); else await db.insert(subscriptions).values(values);
  await recordAudit(businessId, null, "billing.subscription_synchronised", "subscription", stripeSubscription.id, { status: values.status, planCode });
}

export async function stripeWebhookHandler(req: Request, res: Response) {
  const readiness = stripeReadiness();
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).json({ error: "Stripe webhook non configuré." });
  const signature = req.header("stripe-signature"); if (!signature) return res.status(400).json({ error: "Signature Stripe absente." });
  let event: Stripe.Event;
  try { event = new Stripe(process.env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2 }).webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET); } catch { return res.status(400).json({ error: "Signature Stripe invalide." }); }
  if (event.id.startsWith("evt_test_")) { console.info("[Stripe webhook] test vérifié", { type: event.type, id: event.id }); return res.json({ verified: true }); }
  const db = await getRequiredDb(); const duplicate = await db.select({ id: stripeWebhookEvents.id }).from(stripeWebhookEvents).where(eq(stripeWebhookEvents.eventId, event.id)).limit(1); if (duplicate[0]) return res.json({ received: true, duplicate: true });
  const metadata = (event.data.object as Stripe.Subscription | Stripe.Checkout.Session).metadata ?? {}; const businessId = Number(metadata.business_id); const planCode = metadata.plan_code || "starter"; const created = await db.insert(stripeWebhookEvents).values({ eventId: event.id, eventType: event.type, businessId: Number.isInteger(businessId) && businessId > 0 ? businessId : null });
  try {
    if ((event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") && Number.isInteger(businessId) && businessId > 0) await syncSubscription(event.data.object as Stripe.Subscription, businessId, planCode);
    if (event.type === "checkout.session.completed") { const session = event.data.object as Stripe.Checkout.Session; const id = Number(session.metadata?.business_id); if (Number.isInteger(id) && id > 0 && session.subscription) { const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2 }); const subscription = await stripe.subscriptions.retrieve(String(session.subscription)); await syncSubscription(subscription, id, session.metadata?.plan_code || "starter"); } }
    await db.update(stripeWebhookEvents).set({ processedAt: new Date() }).where(eq(stripeWebhookEvents.id, Number(created[0].insertId))); return res.json({ received: true });
  } catch (error) { logOperationalError("stripe.webhook_failed", error, { eventType: event.type }); return res.status(500).json({ error: "Traitement webhook échoué." }); }
}
