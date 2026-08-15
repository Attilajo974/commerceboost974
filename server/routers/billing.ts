import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { subscriptionPlans, subscriptions } from "../../drizzle/schema";
import { applicationOrigin, requireStripe } from "../billing/stripe";
import { configuredStripePriceId, getBusinessPlan, isPlanCode, PLAN_CODES, PLAN_DEFINITIONS, requirePlanFeature, stripeReadiness } from "../billing/plans";
import { enforceActionRateLimit } from "../domain/rateLimit";
import { recordAudit, requireBusinessAccess } from "../domain/tenant";
import { protectedProcedure, router } from "../_core/trpc";

const businessInput = z.object({ businessId: z.number().int().positive() });

export const billingRouter = router({
  plans: protectedProcedure.query(() => ({ plans: PLAN_CODES.map(code => ({ code, ...PLAN_DEFINITIONS[code], stripePriceConfigured: Boolean(configuredStripePriceId(code)) })), stripeConfigured: stripeReadiness().configured })),
  status: protectedProcedure.input(businessInput).query(async ({ ctx, input }) => { await requireBusinessAccess(ctx.user.id, input.businessId); return { ...(await getBusinessPlan(input.businessId)), stripeConfigured: stripeReadiness().configured }; }),
  createCheckout: protectedProcedure.input(businessInput.extend({ plan: z.enum(PLAN_CODES) })).mutation(async ({ ctx, input }) => {
    await enforceActionRateLimit("billing.checkout", `user:${ctx.user.id}:business:${input.businessId}`); const { db, membership } = await requireBusinessAccess(ctx.user.id, input.businessId, ["owner"]); const stripe = requireStripe(); const price = configuredStripePriceId(input.plan); if (!price) throw new TRPCError({ code: "PRECONDITION_FAILED", message: `Le Price ID du plan ${input.plan} doit être configuré.` });
    const existing = await db.select().from(subscriptions).where(eq(subscriptions.businessId, input.businessId)).limit(1); const origin = applicationOrigin();
    const session = await stripe.checkout.sessions.create({ mode: "subscription", line_items: [{ price, quantity: 1 }], customer: existing[0]?.stripeCustomerId || undefined, customer_email: existing[0]?.stripeCustomerId ? undefined : ctx.user.email || undefined, client_reference_id: String(ctx.user.id), allow_promotion_codes: true, success_url: `${origin}/app/abonnement?success=1`, cancel_url: `${origin}/app/abonnement?cancelled=1`, metadata: { business_id: String(input.businessId), plan_code: input.plan, user_id: String(ctx.user.id), membership_role: membership.role }, subscription_data: { metadata: { business_id: String(input.businessId), plan_code: input.plan } } });
    if (!session.url) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe n’a pas retourné de lien de paiement." }); await recordAudit(input.businessId, ctx.user.id, "billing.checkout_created", "subscription", existing[0]?.id, { plan: input.plan }); return { url: session.url };
  }),
  portal: protectedProcedure.input(businessInput).mutation(async ({ ctx, input }) => { await enforceActionRateLimit("billing.portal", `user:${ctx.user.id}:business:${input.businessId}`); const { db } = await requireBusinessAccess(ctx.user.id, input.businessId, ["owner"]); const subscription = await db.select().from(subscriptions).where(eq(subscriptions.businessId, input.businessId)).limit(1); if (!subscription[0]?.stripeCustomerId) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Aucun client Stripe actif n’est associé à cette entreprise." }); const session = await requireStripe().billingPortal.sessions.create({ customer: subscription[0].stripeCustomerId, return_url: `${applicationOrigin()}/app/abonnement` }); await recordAudit(input.businessId, ctx.user.id, "billing.portal_created", "subscription", subscription[0].id); return { url: session.url }; }),
  requestFeature: protectedProcedure.input(businessInput.extend({ feature: z.enum(["public_shop", "analytics", "ai", "automations"]) })).query(async ({ ctx, input }) => { await requireBusinessAccess(ctx.user.id, input.businessId); return requirePlanFeature(input.businessId, input.feature); }),
});
