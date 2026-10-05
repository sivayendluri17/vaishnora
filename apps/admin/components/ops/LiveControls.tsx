"use client";

// The control row for the monitoring pages: time-range buttons (optional), a
// Refresh button, an auto-refresh switch, and the time the data was fetched.
//
// CloudWatch only produces a new datapoint every few minutes, so a reload often
// changes nothing visible. This makes a refresh unmistakable: the button says
// "Refreshing", the content dims while new data loads, and the "Updated" time
// changes and briefly highlights when it lands.

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const AUTO_KEY = "vaishnora_ops_auto_refresh";
const AUTO_SECONDS = 60;

type RangeOption = { key: string; label: string };

export default function LiveControls({
  fetchedAt,
  ranges,
  activeRange,
  basePath,
}: {
  /** Server time (epoch ms) at which the data on the page was fetched. */
  fetchedAt: number;
  ranges?: RangeOption[];
  activeRange?: string;
  /** Path the range buttons navigate to, e.g. "/admin/metrics". */
  basePath?: string;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();
  const [auto, setAuto] = useState(true);
  const [clock, setClock] = useState<string | null>(null); // local time text, set after mount
  const [flash, setFlash] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_SECONDS);
  const firstRender = useRef(true);

  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  const go = useCallback(
    (key: string) => {
      if (!basePath) return;
      startTransition(() => router.push(`${basePath}?range=${key}`, { scroll: false }));
    },
    [router, basePath]
  );

  // Remember the auto-refresh choice. Storage can be unavailable (private mode).
  useEffect(() => {
    try {
      if (localStorage.getItem(AUTO_KEY) === "off") setAuto(false);
    } catch { /* keep default */ }
  }, []);
  function toggleAuto() {
    setAuto((on) => {
      try { localStorage.setItem(AUTO_KEY, on ? "off" : "on"); } catch { /* ignore */ }
      return !on;
    });
  }

  // New data arrived: show its time in the viewer's zone and flash it once.
  useEffect(() => {
    setClock(new Date(fetchedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" }));
    setSecondsLeft(AUTO_SECONDS);
    if (firstRender.current) { firstRender.current = false; return; }
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 1600);
    return () => clearTimeout(t);
  }, [fetchedAt]);

  // Countdown to the next automatic refresh; paused while the tab is hidden.
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => {
      if (document.hidden) return;
      setSecondsLeft((s) => {
        if (s > 1) return s - 1;
        refresh();
        return AUTO_SECONDS;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [auto, refresh]);

  // Dim the page content while loading, holding the previous render in place.
  useEffect(() => {
    const page = rootRef.current?.closest(".ops");
    page?.toggleAttribute("data-refreshing", pending);
    return () => { page?.removeAttribute("data-refreshing"); };
  }, [pending]);

  return (
    <div ref={rootRef} className="live">
      {ranges && (
        <div className="ops-range" role="group" aria-label="Time range">
          {ranges.map((r) => (
            <button
              key={r.key}
              type="button"
              className={`ops-range-btn ${r.key === activeRange ? "is-active" : ""}`}
              aria-pressed={r.key === activeRange}
              onClick={() => go(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      <div className="live-row">
        <button type="button" className="live-refresh" onClick={refresh} disabled={pending} aria-busy={pending}>
          <span className={`live-icon ${pending ? "is-spinning" : ""}`} aria-hidden="true">↻</span>
          {pending ? "Refreshing…" : "Refresh"}
        </button>

        <label className="live-auto">
          <input type="checkbox" checked={auto} onChange={toggleAuto} />
          Auto-refresh{auto && !pending ? ` in ${secondsLeft}s` : ""}
        </label>

        <span className={`live-updated ${flash ? "is-flash" : ""}`} role="status" aria-live="polite">
          {pending ? "Loading new data…" : clock ? `Updated ${clock}` : " "}
        </span>
      </div>
    </div>
  );
}
