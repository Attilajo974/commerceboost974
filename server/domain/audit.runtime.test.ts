import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ inserted: null as Record<string, unknown> | null }));
const values = vi.hoisted(() => vi.fn(async (payload: Record<string, unknown>) => { state.inserted = payload; }));
const insert = vi.hoisted(() => vi.fn(() => ({ values })));

vi.mock("../db", () => ({ getDb: vi.fn(async () => ({ insert })) }));

import { recordAudit } from "./tenant";

describe("recordAudit — exécution runtime", () => {
  it("transmet les attributs d’audit tenantés à la couche de base", async () => {
    state.inserted = null;
    await recordAudit(9, 41, "product.created", "product", 101, { source: "dashboard" });
    expect(state.inserted).toEqual({
      businessId: 9,
      actorUserId: 41,
      action: "product.created",
      entityType: "product",
      entityId: "101",
      metadata: { source: "dashboard" },
    });
  });
});
