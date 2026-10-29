"use client";

// What the shop does when React crashes in a shopper's browser: tell the
// server (CloudWatch metric + log line) and CloudWatch RUM, and decide
// whether a reload will fix it. Used by app/error.tsx and app/global-error.tsx.

import { classifyClientError, type ClientErrorKind, type ClientErrorReport } from "@vaishnora/core/client-errors";

const RELOAD_FLAG = "vaishnora_crash_reloaded";

/** Minimal shape of the RUM client we keep on window (set by RumMonitor). */
type RumLike = { recordError: (e: unknown) => void };

export function kindOf(error: { message?: string; name?: string }): ClientErrorKind {
  return classifyClientError(error?.message, error?.name);
}

/** Send the crash to /api/client-error and RUM. Never throws. */
export function reportClientError(error: { message?: string; name?: string; stack?: string; digest?: string }, where: "page" | "root"): void {
  try {
    const w = window as unknown as { __vaishnoraRum?: RumLike };
    w.__vaishnoraRum?.recordError(error);
  } catch { /* RUM not loaded */ }
  try {
    const report: ClientErrorReport = {
      message: String(error?.message ?? "Unknown error"),
      name: error?.name,
      stack: error?.stack,
      digest: error?.digest,
      url: window.location.href,
      where,
      kind: kindOf(error),
    };
    const body = JSON.stringify(report);
    // sendBeacon survives the reload we may trigger right after
    if (!navigator.sendBeacon?.("/api/client-error", new Blob([body], { type: "application/json" }))) {
      fetch("/api/client-error", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
    }
  } catch { /* reporting must never crash the crash page */ }
}

/**
 * A stale-build crash is fixed by fetching fresh HTML. Reload once per tab;
 * the flag stops a reload loop if the reload crashes too.
 */
export function reloadOnceIfStale(error: { message?: string; name?: string }): boolean {
  if (kindOf(error) !== "stale-build") return false;
  try {
    if (sessionStorage.getItem(RELOAD_FLAG)) return false;
    sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
  } catch {
    return false; // no storage: cannot guard against a loop, so do not reload
  }
  window.location.reload();
  return true;
}

/** Call once a page renders fine, so a later stale-build crash may reload again. */
export function clearReloadFlag(): void {
  try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* ignore */ }
}
