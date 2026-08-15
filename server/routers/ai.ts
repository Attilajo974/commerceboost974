import { and, desc, eq, gte, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { aiGenerations, businesses, orderItems, orders, products } from "../../drizzle/schema";
import { invokeLLM, listLLMModels } from "../_core/llm";
import { enforceActionRateLimit } from "../domain/rateLimit";
import { recordAudit, requireBusinessAccess } from "../domain/tenant";
import { protectedProcedure, router } from "../_core/trpc";

async function preferredModel() {
  const { data } = await listLLMModels();
  return data.find(model => model.id === "gpt-5-mini")?.id ?? data.find(model => model.id.includes("mini"))?.id ?? data[0]?.id;
}

async function generateAndLog(input: { businessId: number; userId: number; feature: "product_copy" | "business_insight" | "natural_language_query"; inputSummary: string; messages: { role: "system" | "user"; content: string }[] }) {
  const { db } = await requireBusinessAccess(input.userId, input.businessId);
  const model = await preferredModel();
  if (!model) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Aucun modèle IA n’est disponible actuellement." });
  try {
    const response = await invokeLLM({ model, maxTokens: 700, messages: input.messages });
    const rawOutput = response.choices[0]?.message.content;
    const output = typeof rawOutput === "string" ? rawOutput.trim() : "";
    if (!output) throw new Error("Réponse IA vide");
    await db.insert(aiGenerations).values({ businessId: input.businessId, userId: input.userId, feature: input.feature, model, inputSummary: input.inputSummary.slice(0, 1000), output, status: "success" });
    await recordAudit(input.businessId, input.userId, "ai.generated", "ai_generation", undefined, { feature: input.feature });
    return output;
  } catch (error) {
    await db.insert(aiGenerations).values({ businessId: input.businessId, userId: input.userId, feature: input.feature, model: model ?? null, inputSummary: input.inputSummary.slice(0, 1000), output: null, status: "failed" });
    console.error("[AI] Génération impossible", error);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "L’assistant n’est pas disponible pour le moment." });
  }
}

export const aiRouter = router({
  improveProduct: protectedProcedure.input(z.object({ businessId: z.number().int().positive(), productId: z.number().int().positive(), intent: z.enum(["description", "title", "short_pitch"]).default("description") })).mutation(async ({ ctx, input }) => {
    await enforceActionRateLimit("ai.generation", `user:${ctx.user.id}:business:${input.businessId}`);
    const { db } = await requireBusinessAccess(ctx.user.id, input.businessId, ["owner", "manager"]);
    const [product] = await db.select().from(products).where(and(eq(products.id, input.productId), eq(products.businessId, input.businessId))).limit(1);
    if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Produit introuvable." });
    const [business] = await db.select().from(businesses).where(eq(businesses.id, input.businessId)).limit(1);
    const instruction = input.intent === "title" ? "un titre plus clair" : input.intent === "short_pitch" ? "un argumentaire court" : "une description de produit claire";
    const text = await generateAndLog({ businessId: input.businessId, userId: ctx.user.id, feature: "product_copy", inputSummary: `${input.intent}: ${product.name}`, messages: [{ role: "system", content: "Tu es un assistant rédactionnel pour une petite entreprise réunionnaise. Réponds uniquement en français, sans promesse invérifiable ni superlatif. Le résultat doit être directement réutilisable." }, { role: "user", content: `Entreprise : ${business?.name ?? "Commerce local"}. Activité : ${business?.activityType ?? "non précisée"}. Produit : ${product.name}. Description existante : ${product.description ?? "aucune"}. Rédige ${instruction}, en 70 à 120 mots maximum.` }] });
    return { text };
  }),

  weeklyInsight: protectedProcedure.input(z.object({ businessId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await enforceActionRateLimit("ai.generation", `user:${ctx.user.id}:business:${input.businessId}`);
    const { db } = await requireBusinessAccess(ctx.user.id, input.businessId);
    const from = new Date(); from.setDate(from.getDate() - 7);
    const recentOrders = await db.select().from(orders).where(and(eq(orders.businessId, input.businessId), gte(orders.createdAt, from))).orderBy(desc(orders.createdAt));
    const popular = await db.select({ name: orderItems.productName, units: sql<number>`sum(${orderItems.quantity})` }).from(orderItems).innerJoin(orders, eq(orderItems.orderId, orders.id)).where(and(eq(orders.businessId, input.businessId), gte(orders.createdAt, from))).groupBy(orderItems.productName).orderBy(desc(sql`sum(${orderItems.quantity})`)).limit(3);
    const revenue = recentOrders.filter(order => order.status !== "cancelled").reduce((sum, order) => sum + order.totalCents, 0);
    const text = await generateAndLog({ businessId: input.businessId, userId: ctx.user.id, feature: "business_insight", inputSummary: `7 jours: ${recentOrders.length} commandes, ${revenue} cents`, messages: [{ role: "system", content: "Tu es un copilote de gestion pour une très petite entreprise. Réponds en français, en trois points courts et utiles : constat, opportunité, prochaine action. Ne fabrique aucune donnée." }, { role: "user", content: `Sur les 7 derniers jours : ${recentOrders.length} commandes, ${revenue / 100} EUR hors commandes annulées. Produits les plus commandés : ${popular.map(row => `${row.name} (${row.units})`).join(", ") || "aucun"}. Analyse uniquement ces données.` }] });
    return { text };
  }),
});
