import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ count: 0 }));
const db = vi.hoisted(() => ({
  delete: vi.fn(() => ({ where: vi.fn(async () => undefined) })),
  insert: vi.fn(() => ({ values: vi.fn(() => ({ onDuplicateKeyUpdate: vi.fn(async () => { state.count += 1; }) })) })),
  select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(async () => [{ count: state.count }]) })) })) })),
}));

vi.mock("./tenant", () => ({ getRequiredDb: vi.fn(async () => db) }));

import { enforceActionRateLimit } from "./rateLimit";

describe("enforceActionRateLimit — intégration du quota partagé", () => {
  it("retourne TOO_MANY_REQUESTS lorsque la politique est dépassée", async () => {
    state.count = 0;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await expect(enforceActionRateLimit("business.create", "user:quota-test")).resolves.toBeUndefined();
    }
    await expect(enforceActionRateLimit("business.create", "user:quota-test")).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
  });
});
