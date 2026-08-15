import { and, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { products, promotionProducts, promotions } from "../../drizzle/schema";
import { getRequiredDb } from "./tenant";
import { calculateBestUnitDiscount } from "./pricing";

type CartLine = { productId: number; quantity: number };

export type PricedLine = {
  product: typeof products.$inferSelect;
  quantity: number;
  unitPriceCents: number;
  unitDiscountCents: number;
  lineTotalCents: number;
};

export async function priceCart(businessId: number, cart: CartLine[]) {
  const db = await getRequiredDb();
  const productIds = Array.from(new Set(cart.map(line => line.productId)));
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.businessId, businessId), inArray(products.id, productIds), eq(products.status, "active"), eq(products.isAvailable, true)));

  if (rows.length !== productIds.length) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Un produit du panier n’est plus disponible." });
  }

  const now = new Date();
  const activePromotions = (await db.select().from(promotions).where(and(eq(promotions.businessId, businessId), eq(promotions.isActive, true)))).filter(
    promotion => (!promotion.startsAt || promotion.startsAt <= now) && (!promotion.endsAt || promotion.endsAt >= now)
  );
  const targeted = activePromotions.length
    ? await db.select().from(promotionProducts).where(inArray(promotionProducts.promotionId, activePromotions.map(promotion => promotion.id)))
    : [];
  const targetsByPromotion = new Map<number, Set<number>>();
  for (const target of targeted) {
    const set = targetsByPromotion.get(target.promotionId) ?? new Set<number>();
    set.add(target.productId);
    targetsByPromotion.set(target.promotionId, set);
  }

  const rowById = new Map(rows.map(product => [product.id, product]));
  let subtotalCents = 0;
  let discountCents = 0;
  const lines: PricedLine[] = cart.map(line => {
    const product = rowById.get(line.productId);
    if (!product) throw new TRPCError({ code: "BAD_REQUEST", message: "Produit introuvable." });
    if (product.trackInventory && (product.stockQuantity ?? 0) < line.quantity) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Stock insuffisant pour « ${product.name} ».` });
    }

    const eligible = activePromotions.filter(promotion => promotion.appliesToAll || targetsByPromotion.get(promotion.id)?.has(product.id));
    const bestUnitDiscount = calculateBestUnitDiscount(product.priceCents, eligible);
    const unitPriceCents = product.priceCents - bestUnitDiscount;
    subtotalCents += product.priceCents * line.quantity;
    discountCents += bestUnitDiscount * line.quantity;
    return {
      product,
      quantity: line.quantity,
      unitPriceCents,
      unitDiscountCents: bestUnitDiscount,
      lineTotalCents: unitPriceCents * line.quantity,
    };
  });

  return { lines, subtotalCents, discountCents, totalCents: subtotalCents - discountCents };
}
