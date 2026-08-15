import { describe, expect, it } from "vitest";
import { canTransitionOrderStatus } from "./orderState";

describe("canTransitionOrderStatus", () => {
  it("autorise uniquement le parcours opérationnel prévu", () => {
    expect(canTransitionOrderStatus("new", "confirmed")).toBe(true);
    expect(canTransitionOrderStatus("preparing", "ready")).toBe(true);
    expect(canTransitionOrderStatus("ready", "completed")).toBe(true);
  });

  it("bloque les retours et les modifications d’une commande terminale", () => {
    expect(canTransitionOrderStatus("new", "completed")).toBe(false);
    expect(canTransitionOrderStatus("completed", "preparing")).toBe(false);
    expect(canTransitionOrderStatus("cancelled", "confirmed")).toBe(false);
  });
});
