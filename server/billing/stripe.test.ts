import { afterEach, describe, expect, it } from "vitest";
import { requireStripe } from "./stripe";

const saved = { starter: process.env.STRIPE_PRICE_STARTER, business: process.env.STRIPE_PRICE_BUSINESS, pro: process.env.STRIPE_PRICE_PRO };
afterEach(() => { process.env.STRIPE_PRICE_STARTER = saved.starter; process.env.STRIPE_PRICE_BUSINESS = saved.business; process.env.STRIPE_PRICE_PRO = saved.pro; });

describe("activation Stripe", () => {
  it("refuse un checkout sans les trois Price IDs Stripe réels", () => {
    delete process.env.STRIPE_PRICE_STARTER; delete process.env.STRIPE_PRICE_BUSINESS; delete process.env.STRIPE_PRICE_PRO;
    expect(() => requireStripe()).toThrow(/pas encore configurée/i);
  });
});
