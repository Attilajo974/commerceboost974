import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const dbSelect = vi.fn();
vi.mock("../db", () => ({ getDb: vi.fn(async () => ({ select: dbSelect })) }));

import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { requireBusinessAccess } from "./tenant";

const testRouter = router({
  protectedPing: protectedProcedure.query(() => "member-ok"),
  adminPing: adminProcedure.query(() => "admin-ok"),
});

function context(role: "user" | "admin" = "user", authenticated = true): TrpcContext {
  const now = new Date();
  return {
    user: authenticated ? { id: 21, openId: "access-test", name: "Test", email: "test@example.com", loginMethod: "manus", role, createdAt: now, updatedAt: now, lastSignedIn: now } : null,
    req: { protocol: "https", headers: { "x-commerceboost-csrf": "same-origin" } } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function membership(role: "owner" | "manager" | "staff", status: "active" | "invited" = "active") {
  dbSelect.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [{ id: 1, userId: 21, businessId: 9, role, status }] }) }) });
}

describe("contrat d’accès et d’authentification", () => {
  it("refuse une procédure protégée sans session", async () => {
    await expect(testRouter.createCaller(context("user", false)).protectedPing()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("refuse l’administration à un utilisateur connecté non administrateur", async () => {
    await expect(testRouter.createCaller(context()).adminPing()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("autorise une procédure administrateur pour le rôle admin", async () => {
    await expect(testRouter.createCaller(context("admin")).adminPing()).resolves.toBe("admin-ok");
  });

  it.each(["owner", "manager", "staff"] as const)("autorise le rôle %s dans son périmètre métier général", async role => {
    membership(role);
    await expect(requireBusinessAccess(21, 9)).resolves.toMatchObject({ membership: { role } });
  });

  it("réserve une action de propriétaire aux seuls propriétaires", async () => {
    membership("manager");
    await expect(requireBusinessAccess(21, 9, ["owner"])).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuse une adhésion non active", async () => {
    membership("owner", "invited");
    await expect(requireBusinessAccess(21, 9)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
