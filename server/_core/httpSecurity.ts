import type { Request } from "express";
import { CSRF_HEADER_NAME, CSRF_HEADER_VALUE } from "../../shared/const";

export { CSRF_HEADER_NAME, CSRF_HEADER_VALUE };
export const JSON_BODY_LIMIT = "1mb";
export const URL_ENCODED_BODY_LIMIT = "64kb";

function firstHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function requestProtocol(req: Pick<Request, "protocol" | "headers">) {
  const forwarded = firstHeader(req.headers["x-forwarded-proto"]);
  return (forwarded?.split(",")[0]?.trim() || req.protocol || "https").toLowerCase();
}

/**
 * Browser mutations require a non-simple header. Cross-site browser requests
 * cannot attach it without a CORS preflight, and no CORS allow-list is exposed.
 * If the browser sends Origin, it must also match the effective request origin.
 */
export function isCsrfRequestValid(req: Pick<Request, "protocol" | "headers">) {
  if (firstHeader(req.headers[CSRF_HEADER_NAME]) !== CSRF_HEADER_VALUE) return false;
  const origin = firstHeader(req.headers.origin);
  if (!origin) return true;
  const host = firstHeader(req.headers.host);
  return Boolean(host) && origin === `${requestProtocol(req)}://${host}`;
}
