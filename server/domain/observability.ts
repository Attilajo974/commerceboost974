type SafeContext = Record<string, string | number | boolean | null | undefined>;

function safeContext(context: SafeContext) {
  return Object.fromEntries(Object.entries(context).filter(([key, value]) => value !== undefined && !/(token|secret|authorization|cookie|password|email|phone|body|payload)/i.test(key)));
}

/** Logs operational metadata only; error messages and payloads can contain personal or secret data. */
export function logOperationalError(event: string, error: unknown, context: SafeContext = {}) {
  const errorKind = error instanceof Error ? error.name.slice(0, 80) : "UnknownError";
  console.error(JSON.stringify({ level: "error", event, errorKind, context: safeContext(context), timestamp: new Date().toISOString() }));
}
