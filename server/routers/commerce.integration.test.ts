import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn(), transaction: vi.fn() },
  requireBusinessAccess: vi.fn(),
  recordAudit: vi.fn(),
  enforceActionRateLimit: vi.fn(),
  priceCart: vi.fn(),
}));

vi.mock("../domain/tenant", () => ({
  getRequiredDb: vi.fn(async () => mocks.db),
  requireBusinessAccess: mocks.requireBusinessAccess,
  recordAudit: mocks.recordAudit,
}));
vi.mock("../domain/rateLimit", () => ({ enforceActionRateLimit: mocks.enforceActionRateLimit }));
vi.mock("../domain/commerce", () => ({ priceCart: mocks.priceCart }));
vi.mock("../billing/plans", async importOriginal => ({ ...(await importOriginal<typeof import("../billing/plans")>()), requirePlanFeature: vi.fn(async () => ({ code: "business" })) }));

import { appRouter } from "../routers";

function context(): TrpcContext {
  return {
    user: { id: 41, openId: "owner-41", name: "Propriétaire", email: "atelier@example.test", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { ip: "198.51.100.8", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("mutations commande — intégration tRPC", () => {
  it("protège et journalise le changement de statut", async () => {
    mocks.enforceActionRateLimit.mockResolvedValue(undefined);
    mocks.requireBusinessAccess.mockResolvedValue({ db: mocks.db, membership: { role: "manager" } });
    mocks.db.select.mockReturnValue({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(async () => [{ id: 77, status: "new" }]) })) })) });
    mocks.db.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<void>) =>
      callback({ update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => undefined) })) })), insert: vi.fn(() => ({ values: vi.fn(async () => undefined) })) })
    );

    await expect(appRouter.createCaller(context()).order.updateStatus({ businessId: 9, id: 77, status: "confirmed" })).resolves.toEqual({ success: true });
    expect(mocks.enforceActionRateLimit).toHaveBeenCalledWith("order.status", "user:41:business:9");
    expect(mocks.recordAudit).toHaveBeenCalledWith(9, 41, "order.status_updated", "order", 77, { from: "new", to: "confirmed" });
  });

  it("protège et journalise une commande publique après un calcul serveur", async () => {
    mocks.enforceActionRateLimit.mockResolvedValue(undefined);
    mocks.priceCart.mockResolvedValue({
      subtotalCents: 1_200,
      discountCents: 100,
      totalCents: 1_100,
      lines: [{ product: { id: 12, name: "Produit local", trackInventory: false }, quantity: 2, unitPriceCents: 550, lineTotalCents: 1_100 }],
    });
    mocks.db.select.mockReturnValue({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(async () => [{ id: 9, slug: "atelier-kreol", isPublished: true, status: "active" }]) })) })) });
    mocks.db.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
      let insertCount = 0;
      return callback({
        insert: vi.fn(() => {
          insertCount += 1;
          if (insertCount === 1) return { values: vi.fn(() => ({ onDuplicateKeyUpdate: vi.fn(async () => undefined) })) };
          if (insertCount === 2) return { values: vi.fn(async () => [{ insertId: 303 }]) };
          return { values: vi.fn(async () => undefined) };
        }),
        select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(async () => [{ id: 201 }]) })) })) })),
        update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => undefined) })) })),
      });
    });

    const result = await appRouter.createCaller(context()).checkout.create({
      slug: "atelier-kreol",
      cart: [{ productId: 12, quantity: 2 }],
      customer: { firstName: "Lina", lastName: "Hoarau", email: "lina@example.test" },
    });

    expect(result.totalCents).toBe(1_100);
    expect(mocks.enforceActionRateLimit).toHaveBeenCalledWith("checkout.create", "ip:198.51.100.8");
    expect(mocks.recordAudit).toHaveBeenCalledWith(9, null, "order.public_created", "order", 303, expect.objectContaining({ totalCents: 1_100 }));
  });
});
