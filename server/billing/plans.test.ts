import { afterEach, describe, expect, it, vi } from "vitest";
import { configuredStripePriceId, PLAN_CODES, PLAN_DEFINITIONS, stripeReadiness } from "./plans";

const original = { starter: process.env.STRIPE_PRICE_STARTER, business: process.env.STRIPE_PRICE_BUSINESS, pro: process.env.STRIPE_PRICE_PRO, secret: process.env.STRIPE_SECRET_KEY, webhook: process.env.STRIPE_WEBHOOK_SECRET };
afterEach(() => { process.env.STRIPE_PRICE_STARTER = original.starter; process.env.STRIPE_PRICE_BUSINESS = original.business; process.env.STRIPE_PRICE_PRO = original.pro; process.env.STRIPE_SECRET_KEY = original.secret; process.env.STRIPE_WEBHOOK_SECRET = original.webhook; });

describe("plans et préparation Stripe", () => {
  it("définit les offres Starter, Business et Pro exclusivement côté serveur", () => { expect(PLAN_CODES).toEqual(["starter", "business", "pro"]); expect(PLAN_DEFINITIONS.starter.features.ai).toBe(false); expect(PLAN_DEFINITIONS.business.features.analytics).toBe(true); expect(PLAN_DEFINITIONS.pro.features.automations).toBe(true); });
  it("n’accepte pas une valeur non Stripe comme Price ID", () => { process.env.STRIPE_PRICE_STARTER = "starter-placeholder"; expect(configuredStripePriceId("starter")).toBeNull(); });
  it("reste non configuré tant que les clés ou les trois Price IDs réels manquent", () => { process.env.STRIPE_SECRET_KEY = "sk_test_configured_by_platform"; process.env.STRIPE_WEBHOOK_SECRET = "whsec_configured_by_platform"; process.env.STRIPE_PRICE_STARTER = "price_starter"; process.env.STRIPE_PRICE_BUSINESS = "price_business"; delete process.env.STRIPE_PRICE_PRO; expect(stripeReadiness().configured).toBe(false); });
});
