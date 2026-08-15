import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { CSRF_HEADER_NAME, CSRF_HEADER_VALUE, JSON_BODY_LIMIT, URL_ENCODED_BODY_LIMIT, isCsrfRequestValid } from "./httpSecurity";

function request(headers: Record<string, string> = {}, protocol = "https") {
  return { protocol, headers } as unknown as Pick<Request, "protocol" | "headers">;
}

describe("protections HTTP et CSRF", () => {
  it("accepte une mutation légitime même origine avec le marqueur CSRF", () => {
    expect(isCsrfRequestValid(request({ [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE, host: "app.example.test", origin: "https://app.example.test" }))).toBe(true);
  });

  it("refuse une mutation sans marqueur CSRF", () => {
    expect(isCsrfRequestValid(request({ host: "app.example.test", origin: "https://app.example.test" }))).toBe(false);
  });

  it("refuse une mutation cross-site malgré un marqueur forgé", () => {
    expect(isCsrfRequestValid(request({ [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE, host: "app.example.test", origin: "https://evil.example" }))).toBe(false);
  });

  it("conserve des limites de payload strictement inférieures à 50 Mo", () => {
    expect(JSON_BODY_LIMIT).toBe("1mb");
    expect(URL_ENCODED_BODY_LIMIT).toBe("64kb");
  });
});
