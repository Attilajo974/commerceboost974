import { describe, expect, it } from "vitest";
import { ACTION_RATE_POLICIES, getBucketWindow, hashRateLimitSubject } from "./rateLimit";

describe("politiques de limitation", () => {
  it("ne conserve pas de sujet brut dans l’empreinte de compteur", () => {
    const hash = hashRateLimitSubject("ip:198.51.100.42");
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain("198.51.100.42");
  });

  it("construit des fenêtres temporelles stables et bornées", () => {
    const bucket = getBucketWindow(new Date("2026-08-15T10:08:42.000Z"), 10 * 60 * 1000);
    expect(bucket.startedAt.toISOString()).toBe("2026-08-15T10:00:00.000Z");
    expect(bucket.expiresAt.toISOString()).toBe("2026-08-15T10:10:00.000Z");
  });

  it("protège explicitement la création de commandes publiques", () => {
    expect(ACTION_RATE_POLICIES["checkout.create"].limit).toBeLessThan(ACTION_RATE_POLICIES["catalog.mutation"].limit);
  });
});
