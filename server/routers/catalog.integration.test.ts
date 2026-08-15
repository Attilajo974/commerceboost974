import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn(), insert: vi.fn() },
  requireBusinessAccess: vi.fn(),
  recordAudit: vi.fn(),
  enforceActionRateLimit: vi.fn(),
}));

vi.mock("../domain/tenant", () => ({
  getRequiredDb: vi.fn(async () => mocks.db),
  requireBusinessAccess: mocks.requireBusinessAccess,
  recordAudit: mocks.recordAudit,
}));
vi.mock("../domain/rateLimit", () => ({ enforceActionRateLimit: mocks.enforceActionRateLimit }));
vi.mock("../billing/plans", async importOriginal => ({ ...(await importOriginal<typeof import("../billing/plans")>()), enforcePlanLimit: vi.fn(async () => undefined) }));

import { appRouter } from "../routers";

function context(): TrpcContext {
  return {
    user: { id: 41, openId: "owner-41", name: "Propriétaire", email: "atelier@example.test", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { ip: "198.51.100.8", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("product.create — intégration tRPC", () => {
  it("applique le quota catalogue et écrit un audit de produit", async () => {
    mocks.enforceActionRateLimit.mockResolvedValue(undefined);
    mocks.requireBusinessAccess.mockResolvedValue({ db: mocks.db, membership: { role: "owner" } });
    mocks.db.select.mockReturnValue({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(async () => [{ id: 4 }]) })) })) });
    mocks.db.insert.mockReturnValue({ values: vi.fn(async () => [{ insertId: 101 }]) });

    const result = await appRouter.createCaller(context()).product.create({ businessId: 9, name: "Confiture péi", priceCents: 750, categoryId: 4 });

    expect(result).toEqual({ id: 101 });
    expect(mocks.enforceActionRateLimit).toHaveBeenCalledWith("catalog.mutation", "user:41:business:9");
    expect(mocks.recordAudit).toHaveBeenCalledWith(9, 41, "product.created", "product", 101);
  });
});
