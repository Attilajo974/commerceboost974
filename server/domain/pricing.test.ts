import { describe, expect, it } from "vitest";
import { calculateBestUnitDiscount } from "./pricing";

describe("calculateBestUnitDiscount", () => {
  it("conserve la réduction la plus avantageuse sans dépasser le prix", () => {
    expect(
      calculateBestUnitDiscount(2_500, [
        { discountType: "percentage", discountValue: 10 },
        { discountType: "fixed", discountValue: 400 },
      ])
    ).toBe(400);
    expect(calculateBestUnitDiscount(500, [{ discountType: "fixed", discountValue: 900 }])).toBe(500);
  });

  it("refuse les prix monétaires invalides", () => {
    expect(() => calculateBestUnitDiscount(-1, [])).toThrow("prix");
    expect(() => calculateBestUnitDiscount(12.5, [])).toThrow("prix");
  });
});
