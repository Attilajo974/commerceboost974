import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const mocks = vi.hoisted(() => ({ db: { select: vi.fn(), transaction: vi.fn() }, requireBusinessAccess: vi.fn(), recordAudit: vi.fn() }));
vi.mock("../domain/tenant", () => ({ getRequiredDb: vi.fn(async () => mocks.db), requireBusinessAccess: mocks.requireBusinessAccess, recordAudit: mocks.recordAudit }));
vi.mock("../domain/rateLimit", () => ({ enforceActionRateLimit: vi.fn(async () => undefined) }));
import { appRouter } from "../routers";

const user = { id: 41, openId: "command-permission", name: "Commandes", email: "commandes@example.test", loginMethod: "manus", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const context: TrpcContext = { user, req: { headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };

function selectPlan(code: "business" | "pro") { return { from: () => ({ leftJoin: () => ({ where: () => ({ limit: async () => [{ subscription: { businessId: 9, status: "active" }, plan: { code } }] }) }) }) }; }

describe("procédures commandes — permissions Business et Pro réelles", () => {
  it.each(["business", "pro"] as const)("autorise order.get pour %s", async planCode => {
    mocks.requireBusinessAccess.mockResolvedValue({ db: mocks.db, membership: { role: "owner" } }); let call = 0;
    mocks.db.select.mockImplementation(() => { call += 1; if (call === 1) return selectPlan(planCode); if (call === 2) return { from: () => ({ innerJoin: () => ({ where: () => ({ limit: async () => [{ order: { id: 7, businessId: 9 }, customer: { id: 2 } }] }) }) }) }; if (call === 3) return { from: () => ({ where: async () => [] }) }; return { from: () => ({ where: () => ({ orderBy: async () => [] }) }) }; });
    await expect(appRouter.createCaller(context).order.get({ businessId: 9, id: 7 })).resolves.toMatchObject({ order: { id: 7 } });
  });
  it.each(["business", "pro"] as const)("autorise order.updateStatus pour %s", async planCode => {
    mocks.recordAudit.mockReset(); mocks.requireBusinessAccess.mockResolvedValue({ db: mocks.db, membership: { role: "owner" } }); let call = 0;
    mocks.db.select.mockImplementation(() => { call += 1; if (call === 1) return selectPlan(planCode); return { from: () => ({ where: () => ({ limit: async () => [{ id: 7, businessId: 9, status: "new" }] }) }) }; });
    mocks.db.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<void>) => callback({ update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => undefined) })) })), insert: vi.fn(() => ({ values: vi.fn(async () => undefined) })) }));
    await expect(appRouter.createCaller(context).order.updateStatus({ businessId: 9, id: 7, status: "confirmed" })).resolves.toEqual({ success: true });
  });
});
