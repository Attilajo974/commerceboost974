import { describe, expect, it } from "vitest";
import { retentionCutoff } from "./dataRetention";

describe("retentionCutoff", () => {
  const now = new Date("2026-08-15T00:00:00.000Z");

  it("utilise la durée configurée pour les journaux techniques", () => {
    expect(retentionCutoff(now, 120).toISOString()).toBe("2026-04-17T00:00:00.000Z");
  });

  it("borne une durée absente, trop courte ou excessive", () => {
    expect(retentionCutoff(now, Number.NaN).toISOString()).toBe("2025-08-15T00:00:00.000Z");
    expect(retentionCutoff(now, 1).toISOString()).toBe("2026-07-16T00:00:00.000Z");
    expect(retentionCutoff(now, 10_000).toISOString()).toBe("2016-08-17T00:00:00.000Z");
  });
});
