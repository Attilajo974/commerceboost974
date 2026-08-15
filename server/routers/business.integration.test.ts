import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const mocks = vi.hoisted(() => {
  const db = { select: vi.fn(), update: vi.fn() };
  return {
    db,
    requireBusinessAccess: vi.fn(),
    recordAudit: vi.fn(),
    enforceActionRateLimit: vi.fn(),
  };
});

vi.mock("../domain/tenant", () => ({
  getRequiredDb: vi.fn(async () => mocks.db),
  requireBusinessAccess: mocks.requireBusinessAccess,
  recordAudit: mocks.recordAudit,
}));
vi.mock("../domain/rateLimit", () => ({ enforceActionRateLimit: mocks.enforceActionRateLimit }));

import { appRouter } from "../routers";

function context(): TrpcContext {
  return {
    user: {
      id: 41,
      openId: "owner-41",
      name: "Propriétaire",
      email: "atelier@example.test",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { ip: "198.51.100.8", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("business.publish — intégration tRPC", () => {
  it("applique le quota critique et écrit un audit tenanté lors de la publication", async () => {
    mocks.enforceActionRateLimit.mockResolvedValue(undefined);
    mocks.requireBusinessAccess.mockResolvedValue({ db: mocks.db, membership: { role: "owner" } });
    const where = vi.fn(() => ({ limit: vi.fn(async () => [{ id: 9, slug: "atelier-kreol", description: "Créations locales", contactEmail: "contact@example.test" }]) }));
    mocks.db.select.mockReturnValue({ from: vi.fn(() => ({ where })) });
    mocks.db.update.mockReturnValue({ set: vi.fn(() => ({ where: vi.fn(async () => undefined) })) });

    const result = await appRouter.createCaller(context()).business.publish({ businessId: 9 });

    expect(result).toEqual({ success: true, slug: "atelier-kreol" });
    expect(mocks.enforceActionRateLimit).toHaveBeenCalledWith("business.publish", "user:41:business:9");
    expect(mocks.recordAudit).toHaveBeenCalledWith(9, 41, "business.published", "business", 9);
  });
});
