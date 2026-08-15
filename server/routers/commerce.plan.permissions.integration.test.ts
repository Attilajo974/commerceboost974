import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const mocks = vi.hoisted(() => ({ db: { select: vi.fn() }, requireBusinessAccess: vi.fn() }));
vi.mock("../domain/tenant", () => ({ getRequiredDb: vi.fn(async () => mocks.db), requireBusinessAccess: mocks.requireBusinessAccess, recordAudit: vi.fn() }));
import { appRouter } from "../routers";

const user = { id: 41, openId: "business-permission", name: "Permission", email: "permission@example.test", loginMethod: "manus", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const context: TrpcContext = { user, req: { headers: { "x-commerceboost-csrf": "same-origin" } } as TrpcContext["req"], res: {} as TrpcContext["res"] };

function preparePlanAndOrderList(planCode: "business" | "pro") {
  let call = 0;
  mocks.requireBusinessAccess.mockResolvedValue({ db: mocks.db, membership: { role: "owner" } });
  mocks.db.select.mockImplementation(() => ({ from: () => {
    call += 1;
    if (call === 1) return { leftJoin: () => ({ where: () => ({ limit: async () => [{ subscription: { businessId: 9, status: "active" }, plan: { code: planCode } }] }) }) };
    return { innerJoin: () => ({ where: () => ({ orderBy: () => ({ limit: () => ({ offset: async () => [] }) }) }) }) };
  } }));
}

describe("order.list — permissions Business et Pro réelles", () => {
  it("refuse Starter avant toute lecture de commande avec le garde-fou réel", async () => {
    mocks.requireBusinessAccess.mockReset(); mocks.db.select.mockReset();
    mocks.db.select.mockReturnValue({ from: () => ({ leftJoin: () => ({ where: () => ({ limit: async () => [{ subscription: { businessId: 9, status: "trial" }, plan: { code: "starter" } }] }) }) }) });
    await expect(appRouter.createCaller(context).order.list({ businessId: 9 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.requireBusinessAccess).not.toHaveBeenCalled();
  });
  it.each(["business", "pro"] as const)("autorise le plan %s sans simuler requirePlanFeature", async planCode => {
    preparePlanAndOrderList(planCode);
    await expect(appRouter.createCaller(context).order.list({ businessId: 9 })).resolves.toEqual([]);
  });
});
