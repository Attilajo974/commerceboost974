import { describe, expect, it, vi } from "vitest";

const db = { select: vi.fn() };
vi.mock("../domain/tenant", () => ({ getRequiredDb: vi.fn(async () => db) }));

import { requirePlanFeature } from "./plans";

function subscriptionPlan(code: "starter" | "business" | "pro") { db.select.mockReturnValue({ from: () => ({ leftJoin: () => ({ where: () => ({ limit: async () => [{ subscription: { id: 1, businessId: 9, status: "active" }, plan: { id: 2, code } }] }) }) }) }); }

describe("droits de plan serveur", () => {
  it("bloque les analytics pour Starter", async () => { subscriptionPlan("starter"); await expect(requirePlanFeature(9, "analytics")).rejects.toMatchObject({ code: "FORBIDDEN" }); });
  it("bloque les commandes pour Starter", async () => { subscriptionPlan("starter"); await expect(requirePlanFeature(9, "orders")).rejects.toMatchObject({ code: "FORBIDDEN" }); });
  it("autorise les analytics pour Business", async () => { subscriptionPlan("business"); await expect(requirePlanFeature(9, "analytics")).resolves.toMatchObject({ code: "business" }); });
  it("autorise les commandes pour Business et Pro", async () => { subscriptionPlan("business"); await expect(requirePlanFeature(9, "orders")).resolves.toMatchObject({ code: "business" }); subscriptionPlan("pro"); await expect(requirePlanFeature(9, "orders")).resolves.toMatchObject({ code: "pro" }); });
  it("autorise l’IA et les automatisations pour Pro", async () => { subscriptionPlan("pro"); await expect(requirePlanFeature(9, "ai")).resolves.toMatchObject({ code: "pro" }); subscriptionPlan("pro"); await expect(requirePlanFeature(9, "automations")).resolves.toMatchObject({ code: "pro" }); });
});
