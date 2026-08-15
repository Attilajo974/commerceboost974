import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const mocks = vi.hoisted(() => ({ db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), transaction: vi.fn() }, getRequiredDb: vi.fn(), requireBusinessAccess: vi.fn(), recordAudit: vi.fn(), enforceActionRateLimit: vi.fn(), requirePlanFeature: vi.fn(), enforcePlanLimit: vi.fn(), enforceAiMonthlyLimit: vi.fn(), invokeLLM: vi.fn(), createHeartbeatJob: vi.fn() }));

vi.mock("../domain/tenant", () => ({ getRequiredDb: mocks.getRequiredDb, requireBusinessAccess: mocks.requireBusinessAccess, recordAudit: mocks.recordAudit }));
vi.mock("../domain/rateLimit", () => ({ enforceActionRateLimit: mocks.enforceActionRateLimit }));
vi.mock("../billing/plans", async importOriginal => ({ ...(await importOriginal<typeof import("../billing/plans")>()), requirePlanFeature: mocks.requirePlanFeature, enforcePlanLimit: mocks.enforcePlanLimit, enforceAiMonthlyLimit: mocks.enforceAiMonthlyLimit }));
vi.mock("../_core/llm", () => ({ invokeLLM: mocks.invokeLLM, listLLMModels: vi.fn(async () => ({ data: [{ id: "gpt-5-mini" }] })) }));
vi.mock("../_core/heartbeat", () => ({ createHeartbeatJob: mocks.createHeartbeatJob, deleteHeartbeatJob: vi.fn(), updateHeartbeatJob: vi.fn() }));

import { appRouter } from "../routers";

function context(role: "user" | "admin" = "user"): TrpcContext { return { user: { id: 31, openId: "journey-owner", name: "Titulaire", email: "owner@example.test", loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { ip: "198.51.100.8", headers: { cookie: "app_session_id=session", "x-commerceboost-csrf": "same-origin" } } as TrpcContext["req"], res: {} as TrpcContext["res"] }; }
const list = (rows: unknown[]) => ({ from: () => ({ where: () => ({ limit: async () => rows, orderBy: async () => rows }) }) });

describe("Parcours d’intégration représentatifs", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getRequiredDb.mockResolvedValue(mocks.db); mocks.requireBusinessAccess.mockResolvedValue({ db: mocks.db, membership: { role: "owner" } }); mocks.enforceActionRateLimit.mockResolvedValue(undefined); mocks.requirePlanFeature.mockResolvedValue(undefined); mocks.enforcePlanLimit.mockResolvedValue(undefined); mocks.enforceAiMonthlyLimit.mockResolvedValue(undefined); });

  it("parcours professionnel : publie une activité complète et refuse une activité incomplète", async () => {
    mocks.db.update.mockReturnValue({ set: () => ({ where: async () => undefined }) }); mocks.db.select.mockReturnValueOnce(list([{ id: 9, slug: "atelier-pei", description: "Créations locales", contactEmail: "bonjour@atelier.test" }]));
    await expect(appRouter.createCaller(context()).business.publish({ businessId: 9 })).resolves.toEqual({ success: true, slug: "atelier-pei" }); expect(mocks.recordAudit).toHaveBeenCalledWith(9, 31, "business.published", "business", 9);
    mocks.db.select.mockReturnValueOnce(list([{ id: 10, slug: "incomplet", description: null, contactEmail: null }]));
    await expect(appRouter.createCaller(context()).business.publish({ businessId: 10 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("permet à un client de consulter une boutique publique active et son catalogue", async () => {
    mocks.db.select.mockReturnValueOnce(list([{ id: 9, name: "Atelier Péi", slug: "atelier-pei", status: "active", isPublished: true }])).mockReturnValueOnce({ from: () => ({ where: () => ({ orderBy: async () => [{ id: 2, name: "Savon local" }] }) }) }).mockReturnValueOnce({ from: () => ({ where: () => ({ orderBy: async () => [{ id: 3, name: "Savon citron" }] }) }) }).mockReturnValueOnce({ from: () => ({ where: async () => [] }) });
    const shop = await appRouter.createCaller(context()).publicShop.get({ slug: "atelier-pei" });
    expect(shop.business.name).toBe("Atelier Péi"); expect(shop.products).toHaveLength(1);
  });

  it("parcours client : refuse une boutique publique indisponible", async () => {
    mocks.db.select.mockReturnValueOnce(list([]));
    await expect(appRouter.createCaller(context()).publicShop.get({ slug: "boutique-introuvable" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("parcours commerçant : confirme une commande et refuse une transition métier invalide", async () => {
    const transaction = { update: vi.fn(() => ({ set: () => ({ where: async () => undefined }) })), insert: vi.fn(() => ({ values: async () => undefined })) }; mocks.db.transaction.mockImplementation(async (work: (tx: typeof transaction) => Promise<void>) => work(transaction)); mocks.db.select.mockReturnValueOnce(list([{ id: 77, status: "new" }]));
    await expect(appRouter.createCaller(context()).order.updateStatus({ businessId: 9, id: 77, status: "confirmed", note: "Validée" })).resolves.toEqual({ success: true }); expect(mocks.recordAudit).toHaveBeenCalledWith(9, 31, "order.status_updated", "order", 77, { from: "new", to: "confirmed" });
    mocks.db.select.mockReturnValueOnce(list([{ id: 78, status: "new" }]));
    await expect(appRouter.createCaller(context()).order.updateStatus({ businessId: 9, id: 78, status: "completed" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("produit une proposition IA persistée et auditée après autorisation du plan Pro", async () => {
    mocks.db.select.mockReturnValueOnce(list([{ id: 7, name: "Confiture", description: "Fruits locaux" }])).mockReturnValueOnce(list([{ id: 9, name: "Atelier Péi", activityType: "Artisan" }])); mocks.db.insert.mockReturnValue({ values: vi.fn(async () => undefined) }); mocks.invokeLLM.mockResolvedValue({ choices: [{ message: { content: "Une confiture artisanale préparée à La Réunion." } }] });
    const result = await appRouter.createCaller(context()).ai.improveProduct({ businessId: 9, productId: 7, intent: "description" });
    expect(result.text).toContain("confiture artisanale"); expect(mocks.recordAudit).toHaveBeenCalledWith(9, 31, "ai.generated", "ai_generation", undefined, { feature: "product_copy" });
  });

  it("parcours IA : renvoie une erreur sûre quand la réponse du modèle est vide", async () => {
    mocks.db.select.mockReturnValueOnce(list([{ id: 7, name: "Confiture", description: "Fruits locaux" }])).mockReturnValueOnce(list([{ id: 9, name: "Atelier Péi", activityType: "Artisan" }])); mocks.db.insert.mockReturnValue({ values: vi.fn(async () => undefined) }); mocks.invokeLLM.mockResolvedValue({ choices: [{ message: { content: "" } }] });
    await expect(appRouter.createCaller(context()).ai.improveProduct({ businessId: 9, productId: 7, intent: "description" })).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });

  it("crée une automatisation hebdomadaire avec plan, quota, job et audit", async () => {
    mocks.createHeartbeatJob.mockResolvedValue({ taskUid: "cron_weekly_9", nextExecutionAt: "2026-08-17T05:00:00.000Z" }); mocks.db.insert.mockReturnValue({ values: vi.fn(async () => [{ insertId: 42 }]) });
    const result = await appRouter.createCaller(context()).automation.createWeeklySummary({ businessId: 9, name: "Point du lundi" });
    expect(result).toEqual({ id: 42, nextExecutionAt: "2026-08-17T05:00:00.000Z" }); expect(mocks.recordAudit).toHaveBeenCalledWith(9, 31, "automation.created", "automation_rule", 42, { kind: "weekly_summary" });
  });

  it("parcours automatisation : refuse la création quand le plan ne l’autorise pas", async () => {
    mocks.requirePlanFeature.mockRejectedValue(new TRPCError({ code: "FORBIDDEN", message: "Fonction non incluse." }));
    await expect(appRouter.createCaller(context()).automation.createWeeklySummary({ businessId: 9, name: "Point du lundi" })).rejects.toMatchObject({ code: "FORBIDDEN" }); expect(mocks.createHeartbeatJob).not.toHaveBeenCalled();
  });

  it("expose la synthèse opérationnelle uniquement à un administrateur", async () => {
    mocks.db.select.mockReturnValueOnce({ from: async () => [{ value: 3 }] }).mockReturnValueOnce({ from: async () => [{ value: 8 }] }).mockReturnValueOnce({ from: async () => [{ value: 12 }] }).mockReturnValueOnce({ from: () => ({ leftJoin: () => ({ groupBy: () => ({ orderBy: () => ({ limit: async () => [{ id: 9, name: "Atelier Péi", slug: "atelier-pei", status: "active", createdAt: new Date(), ownerCount: 1 }] }) }) }) }) });
    const overview = await appRouter.createCaller(context("admin")).admin.overview();
    expect(overview).toMatchObject({ businessCount: 3, userCount: 8, orderCount: 12 });
  });

  it("refuse la synthèse d’administration à un utilisateur non administrateur", async () => {
    await expect(appRouter.createCaller(context("user")).admin.overview()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
