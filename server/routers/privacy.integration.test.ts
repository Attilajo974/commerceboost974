import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const mocks = vi.hoisted(() => ({ db: { select: vi.fn(), transaction: vi.fn() }, enforceActionRateLimit: vi.fn(), requireBusinessAccess: vi.fn(), recordAudit: vi.fn() }));

vi.mock("../domain/tenant", () => ({ getRequiredDb: vi.fn(async () => mocks.db), requireBusinessAccess: mocks.requireBusinessAccess, recordAudit: mocks.recordAudit }));
vi.mock("../domain/rateLimit", () => ({ enforceActionRateLimit: mocks.enforceActionRateLimit }));

import { appRouter } from "../routers";

function context(): TrpcContext { return { user: { id: 41, openId: "user-to-delete", name: "Titulaire", email: "owner@example.test", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { ip: "198.51.100.8", headers: { "x-commerceboost-csrf": "same-origin" } } as TrpcContext["req"], res: {} as TrpcContext["res"] }; }
function noMembershipRows(rows: unknown[] = []) { mocks.db.select.mockReturnValue({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(async () => rows) })) })) }); }

describe("privacy.deleteMyAccount — intégration tRPC", () => {
  it("refuse la suppression tant qu’un espace est associé", async () => {
    noMembershipRows([{ id: 9 }]); mocks.enforceActionRateLimit.mockResolvedValue(undefined);
    await expect(appRouter.createCaller(context()).privacy.deleteMyAccount({ confirmation: "SUPPRIMER MON COMPTE" })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(mocks.db.transaction).not.toHaveBeenCalled();
  });

  it("crée un marqueur OAuth puis supprime le compte sans garder de profil actif", async () => {
    noMembershipRows(); mocks.enforceActionRateLimit.mockResolvedValue(undefined); const values = vi.fn(async () => undefined); const where = vi.fn(async () => undefined); const tx = { insert: vi.fn(() => ({ values })), delete: vi.fn(() => ({ where })) }; mocks.db.transaction.mockImplementation(async (work: (transaction: typeof tx) => Promise<void>) => work(tx));
    await expect(appRouter.createCaller(context()).privacy.deleteMyAccount({ confirmation: "SUPPRIMER MON COMPTE" })).resolves.toEqual({ success: true });
    expect(values).toHaveBeenCalledWith({ openId: "user-to-delete" }); expect(where).toHaveBeenCalled();
  });
});
