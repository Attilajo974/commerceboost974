import { describe, expect, it, vi } from "vitest";

const dbSelect = vi.fn();
vi.mock("../db", () => ({ getDb: vi.fn(async () => ({ select: dbSelect })) }));

import { requireBusinessAccess } from "./tenant";

describe("requireBusinessAccess", () => {
  it("bloque les utilisateurs qui ne possèdent aucune adhésion active à l’entreprise demandée", async () => {
    dbSelect.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [] }) }) });
    await expect(requireBusinessAccess(41, 99)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("empêche un collaborateur d’exécuter une action réservée au propriétaire", async () => {
    dbSelect.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [{ id: 1, userId: 41, businessId: 99, role: "staff", status: "active" }] }) }) });
    await expect(requireBusinessAccess(41, 99, ["owner"])).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("retourne l’adhésion lorsqu’un rôle autorisé est présent", async () => {
    dbSelect.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [{ id: 1, userId: 41, businessId: 99, role: "manager", status: "active" }] }) }) });
    const result = await requireBusinessAccess(41, 99, ["owner", "manager"]);
    expect(result.membership.role).toBe("manager");
  });
});
