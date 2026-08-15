export type DiscountRule = {
  discountType: "percentage" | "fixed";
  discountValue: number;
};

export function calculateBestUnitDiscount(priceCents: number, rules: DiscountRule[]) {
  if (!Number.isInteger(priceCents) || priceCents < 0) throw new Error("Le prix doit être un entier positif.");
  return rules.reduce((best, rule) => {
    const raw = rule.discountType === "percentage" ? Math.floor((priceCents * rule.discountValue) / 100) : rule.discountValue;
    return Math.max(best, Math.min(priceCents, Math.max(0, raw)));
  }, 0);
}
