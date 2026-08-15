import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ACTION_RATE_POLICIES, SENSITIVE_MUTATION_COVERAGE } from "./rateLimit";

const source = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf-8");

describe("couverture des mutations sensibles", () => {
  it("associe chaque mutation sensible à une politique et à un événement d’audit", () => {
    expect(SENSITIVE_MUTATION_COVERAGE.length).toBeGreaterThanOrEqual(11);
    for (const entry of SENSITIVE_MUTATION_COVERAGE) {
      expect(ACTION_RATE_POLICIES).toHaveProperty(entry.policy);
      expect(entry.audit).toMatch(/\./);
    }
  });

  it("branche réellement les protections et les journaux dans les routeurs", () => {
    const businessSource = source("server/routers/business.ts");
    const catalogSource = source("server/routers/catalog.ts");
    const commerceSource = source("server/routers/commerce.ts");
    for (const policy of ["business.create", "business.profile", "business.onboarding", "business.settings", "business.publish"]) {
      expect(businessSource).toContain(`enforceActionRateLimit("${policy}"`);
    }
    for (const policy of ["catalog.mutation", "promotion.mutation"]) {
      expect(catalogSource).toContain(`enforceActionRateLimit("${policy}"`);
    }
    for (const policy of ["customer.mutation", "order.status", "checkout.create"]) {
      expect(commerceSource).toContain(`enforceActionRateLimit("${policy}"`);
    }
    for (const eventName of ["business.onboarding_updated", "product.updated", "promotion.updated", "customer.updated", "order.status_updated", "order.public_created"]) {
      expect(`${businessSource}${catalogSource}${commerceSource}`).toContain(eventName);
    }
  });
});
