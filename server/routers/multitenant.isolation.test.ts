import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const dbSelect = vi.fn();
vi.mock("../db", () => ({ getDb: vi.fn(async () => ({ select: dbSelect })) }));
vi.mock("../billing/plans", async importOriginal => ({ ...(await importOriginal<typeof import("../billing/plans")>()), requirePlanFeature: vi.fn(async () => undefined), enforcePlanLimit: vi.fn(async () => undefined) }));

import { requireBusinessAccess } from "../domain/tenant";
import { appRouter } from "../routers";

const entrepriseA = 101;
const entrepriseB = 202;
function membershipRows(rows: unknown[]) { return { from: () => ({ where: () => ({ limit: async () => rows }) }) }; }
function contextEntrepriseA(): TrpcContext { return { user: { id: 11, openId: "owner-a", name: "Entreprise A", email: "a@example.test", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { ip: "198.51.100.8", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] }; }

describe("Isolation multi-tenant réelle — Entreprise A contre Entreprise B", () => {
  beforeEach(() => { vi.clearAllMocks(); dbSelect.mockReturnValue(membershipRows([])); });

  it("reconnaît l’adhésion active de A à son propre espace avec le garde-fou réel", async () => {
    dbSelect.mockReturnValue(membershipRows([{ id: 1, businessId: entrepriseA, userId: 11, role: "owner", status: "active" }]));
    await expect(requireBusinessAccess(11, entrepriseA, ["owner"])).resolves.toMatchObject({ membership: { businessId: entrepriseA, userId: 11, role: "owner" } });
  });

  it("refuse à A la lecture des produits de B avant toute requête catalogue", async () => {
    await expect(appRouter.createCaller(contextEntrepriseA()).product.list({ businessId: entrepriseB })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbSelect).toHaveBeenCalledTimes(1);
  });

  it("refuse à A la lecture des clients de B avant toute requête client", async () => {
    await expect(appRouter.createCaller(contextEntrepriseA()).customer.get({ businessId: entrepriseB, id: 88 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbSelect).toHaveBeenCalledTimes(1);
  });

  it("refuse à A la lecture des commandes de B avant toute requête commande", async () => {
    await expect(appRouter.createCaller(contextEntrepriseA()).order.get({ businessId: entrepriseB, id: 77 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbSelect).toHaveBeenCalledTimes(1);
  });
});
