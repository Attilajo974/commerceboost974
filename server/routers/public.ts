import { and, asc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { businesses, categories, products, promotions } from "../../drizzle/schema";
import { publicProcedure, router } from "../_core/trpc";
import { getRequiredDb } from "../domain/tenant";

export const publicShopRouter = router({
  get: publicProcedure.input(z.object({ slug: z.string().min(2).max(120) })).query(async ({ input }) => {
    const db = await getRequiredDb();
    const business = await db.select().from(businesses).where(and(eq(businesses.slug, input.slug), eq(businesses.status, "active"), eq(businesses.isPublished, true))).limit(1);
    if (!business[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Boutique introuvable." });
    const [shopCategories, shopProducts, activePromotions] = await Promise.all([
      db.select().from(categories).where(and(eq(categories.businessId, business[0].id), eq(categories.isActive, true))).orderBy(asc(categories.sortOrder), asc(categories.name)),
      db.select().from(products).where(and(eq(products.businessId, business[0].id), eq(products.status, "active"), eq(products.isAvailable, true))).orderBy(asc(products.name)),
      db.select().from(promotions).where(and(eq(promotions.businessId, business[0].id), eq(promotions.isActive, true))),
    ]);
    return { business: business[0], categories: shopCategories, products: shopProducts, promotions: activePromotions };
  }),
});
