"use client";

// Shown instead of Next's bare "Application error" page when a route crashes
// in the browser. Reports the crash, reloads once if the cause is an old
// deploy's files, and otherwise offers Try again / Reload / Home.

import { useEffect, useState } from "react";
import Link from "next/link";
import { kindOf, reloadOnceIfStale, reportClientError } from "@/lib/client-error";

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    reportClientError(error, "page");
    if (reloadOnceIfStale(error)) setReloading(true);
  }, [error]);

  const stale = kindOf(error) === "stale-build";

  return (
    <section className="section">
      <div className="container crash-page" role="alert">
        <span className="eyebrow">Sorry about this</span>
        <h1 className="crash-title">{reloading ? "Refreshing the page…" : "This page had a hiccup"}</h1>
        <p className="crash-text">
          {stale
            ? "The shop was updated while this page was open. A fresh copy fixes it."
            : "Something went wrong while showing this page. Nothing was charged and your cart is safe."}
        </p>
        {!reloading && (
          <div className="crash-actions">
            <button type="button" className="btn btn-primary" onClick={() => reset()}>Try again</button>
            <button type="button" className="btn btn-outline" onClick={() => window.location.reload()}>Reload the page</button>
            <Link href="/" className="btn btn-outline">Go to the home page</Link>
          </div>
        )}
        <p className="crash-help">
          Still stuck? Order on WhatsApp instead: <a href="https://wa.me/918179456749">+91 81794 56749</a>
        </p>
        {error.digest && <p className="crash-ref">Reference {error.digest}</p>}
      </div>
    </section>
  );
}
