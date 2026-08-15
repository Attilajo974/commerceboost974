import { afterEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { randomBytes } from "crypto";
import Stripe from "stripe";
import { stripeWebhookHandler } from "./webhook";

const savedSecret = process.env.STRIPE_SECRET_KEY;
const savedWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

afterEach(() => {
  if (savedSecret === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = savedSecret;
  if (savedWebhookSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET; else process.env.STRIPE_WEBHOOK_SECRET = savedWebhookSecret;
});

describe("webhook Stripe hors périmètre CSRF", () => {
  it("reste accessible sans en-tête CSRF et conserve sa précondition Stripe indépendante", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const status = vi.fn();
    const json = vi.fn();
    status.mockReturnValue({ json });
    await stripeWebhookHandler({ header: vi.fn(), body: Buffer.from("{}") } as unknown as Request, { status } as unknown as Response);
    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith({ error: "Stripe webhook non configuré." });
  });

  it("accepte un événement Stripe de test signé sans en-tête CSRF", async () => {
    const signingSecret = `whsec_${randomBytes(24).toString("hex")}`;
    process.env.STRIPE_SECRET_KEY = `sk_test_${randomBytes(24).toString("hex")}`;
    process.env.STRIPE_WEBHOOK_SECRET = signingSecret;
    const payload = JSON.stringify({ id: "evt_test_csrf_verified", object: "event", api_version: "2025-02-24.acacia", created: 0, data: { object: { object: "subscription", metadata: {} } }, livemode: false, pending_webhooks: 1, request: null, type: "customer.subscription.created" });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: signingSecret });
    const status = vi.fn();
    const json = vi.fn();
    status.mockReturnValue({ json });
    await stripeWebhookHandler({ header: vi.fn((name: string) => name === "stripe-signature" ? signature : undefined), body: Buffer.from(payload) } as unknown as Request, { status, json } as unknown as Response);
    expect(status).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({ verified: true });
  });
});
