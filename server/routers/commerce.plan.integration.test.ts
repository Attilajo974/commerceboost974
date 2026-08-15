import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const mocks = vi.hoisted(() => ({ requirePlanFeature: vi.fn(async () => { throw new TRPCError({ code: "FORBIDDEN", message: "Offre Starter" }); }) }));
vi.mock("../billing/plans", async importOriginal => ({ ...(await importOriginal<typeof import("../billing/plans")>()), requirePlanFeature: mocks.requirePlanFeature }));
import { appRouter } from "../routers";

const user = { id: 41, openId: "plan-test", name: "Plan", email: "plan@example.test", loginMethod: "manus", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const context: TrpcContext = { user, req: { headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };

describe("order.list — garde-fou plan", () => {
  it("refuse Starter avant toute lecture de commande", async () => {
    await expect(appRouter.createCaller(context).order.list({ businessId: 9 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.requirePlanFeature).toHaveBeenCalledWith(9, "orders");
  });
});
