import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn() },
  enforceActionRateLimit: vi.fn(async () => undefined),
  requireBusinessAccess: vi.fn(async () => ({ db: mocks.db, membership: { role: "owner" } })),
  requireStripe: vi.fn(() => { throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Stripe non configuré" }); }),
}));

vi.mock("../domain/tenant", () => ({ requireBusinessAccess: mocks.requireBusinessAccess, recordAudit: vi.fn() }));
vi.mock("../domain/rateLimit", () => ({ enforceActionRateLimit: mocks.enforceActionRateLimit }));
vi.mock("../billing/stripe", () => ({ requireStripe: mocks.requireStripe, applicationOrigin: vi.fn(() => "https://app.example.test") }));

import { router } from "../_core/trpc";
import { billingRouter } from "./billing";

const app = router({ billing: billingRouter });
const user = { id: 12, openId: "billing-owner", name: "Facturation", email: "billing@example.test", loginMethod: "test", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const context = (headers: Record<string, string>): TrpcContext => ({ user, req: { headers } as TrpcContext["req"], res: {} as TrpcContext["res"] });

describe("facturation protégée par CSRF", () => {
  it("refuse createCheckout sans marqueur CSRF avant toute action Stripe", async () => {
    await expect(app.createCaller(context({})).billing.createCheckout({ businessId: 9, plan: "business" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.enforceActionRateLimit).not.toHaveBeenCalled();
  });

  it("laisse createCheckout atteindre sa précondition Stripe avec un marqueur CSRF valide", async () => {
    await expect(app.createCaller(context({ "x-commerceboost-csrf": "same-origin" })).billing.createCheckout({ businessId: 9, plan: "business" })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(mocks.enforceActionRateLimit).toHaveBeenCalledWith("billing.checkout", "user:12:business:9");
  });

  it("refuse portal sans marqueur CSRF avant toute lecture de facturation", async () => {
    await expect(app.createCaller(context({})).billing.portal({ businessId: 9 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("laisse portal atteindre sa précondition métier avec un marqueur CSRF valide", async () => {
    mocks.db.select.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [] }) }) });
    await expect(app.createCaller(context({ "x-commerceboost-csrf": "same-origin" })).billing.portal({ businessId: 9 })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(mocks.enforceActionRateLimit).toHaveBeenCalledWith("billing.portal", "user:12:business:9");
  });
});
