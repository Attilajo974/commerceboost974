import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./context";
import { adminProcedure, protectedProcedure, router } from "./trpc";

const app = router({
  protectedMutation: protectedProcedure.mutation(() => "protected-ok"),
  protectedQuery: protectedProcedure.query(() => "query-ok"),
  adminMutation: adminProcedure.mutation(() => "admin-ok"),
});

function context(headers: Record<string, string>, role: "user" | "admin" = "user"): TrpcContext {
  return {
    user: { id: 1, openId: "csrf-user", name: "CSRF", email: "csrf@example.test", loginMethod: "test", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("garde CSRF tRPC", () => {
  it("refuse une mutation authentifiée sans marqueur", async () => {
    await expect(app.createCaller(context({})).protectedMutation()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("accepte une mutation authentifiée même origine avec marqueur", async () => {
    await expect(app.createCaller(context({ "x-commerceboost-csrf": "same-origin", host: "app.example.test", origin: "https://app.example.test" })).protectedMutation()).resolves.toBe("protected-ok");
  });

  it("conserve les lectures authentifiées sans exigence CSRF", async () => {
    await expect(app.createCaller(context({})).protectedQuery()).resolves.toBe("query-ok");
  });

  it("refuse une mutation administrateur cross-site", async () => {
    await expect(app.createCaller(context({ "x-commerceboost-csrf": "same-origin", host: "app.example.test", origin: "https://evil.example" }, "admin")).adminMutation()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
