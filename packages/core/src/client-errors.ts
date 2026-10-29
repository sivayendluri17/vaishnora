// Sorting browser-side crashes into kinds we can act on. Pure, so the shop's
// error pages (client) and /api/client-error (server) share one definition
// and the admin metrics and alarms count the same thing.

export type ClientErrorKind = "stale-build" | "hydration" | "storage" | "network" | "other";

/**
 * "stale-build": the HTML the shopper got refers to JavaScript files from an
 * older deploy that no longer exist (long CDN cache, a tab left open for
 * days). A reload fetches matching files and fixes it. The other kinds are
 * real bugs or device limits and are only reported.
 */
export function classifyClientError(message: string | null | undefined, name?: string | null): ClientErrorKind {
  const text = `${name ?? ""} ${message ?? ""}`;
  if (/ChunkLoadError|Loading chunk|Loading CSS chunk|dynamically imported module|Importing a module script failed|reading 'call'|Unexpected token '<'|Cannot find module/i.test(text)) return "stale-build";
  if (/Hydration failed|hydrat|did not match|Minified React error #(418|422|423|425)/i.test(text)) return "hydration";
  if (/localStorage|sessionStorage|QuotaExceeded|SecurityError|The operation is insecure/i.test(text)) return "storage";
  if (/NetworkError|Failed to fetch|Load failed|net::ERR/i.test(text)) return "network";
  return "other";
}

/** Payload the shop posts to /api/client-error. Everything is trimmed server-side. */
export type ClientErrorReport = {
  message: string;
  name?: string;
  stack?: string;
  url?: string;
  /** Which boundary caught it: "page" (app/error.tsx) or "root" (app/global-error.tsx). */
  where?: string;
  kind?: ClientErrorKind;
  digest?: string;
};

const MAX = { message: 500, name: 80, stack: 4000, url: 500, where: 20, digest: 64 } as const;

/** Validate and trim an incoming report. Returns null when it is not a report at all. */
export function parseClientErrorReport(body: unknown): ClientErrorReport | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.message !== "string" || !b.message.trim()) return null;
  const str = (k: keyof typeof MAX) => (typeof b[k] === "string" ? (b[k] as string).slice(0, MAX[k]) : undefined);
  const message = b.message.slice(0, MAX.message);
  const kind = classifyClientError(message, str("name"));
  return { message, name: str("name"), stack: str("stack"), url: str("url"), where: str("where"), digest: str("digest"), kind };
}
