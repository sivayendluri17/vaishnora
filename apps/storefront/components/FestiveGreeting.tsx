"use client";

// Festive poster shown the first time a shopper opens the site while an
// occasion from content/occasions.ts is running. It appears once per device
// (closing it is remembered), can be closed with the cross, the backdrop or
// Escape, and switches itself off after the occasion's last day so no deploy
// is needed to take it down. Tapping the poster opens the shop. Never shown
// on checkout: nothing should get between a customer and the Pay button.
//
// To add Christmas, New Year, Sankranti or next Diwali, edit
// apps/storefront/content/occasions.ts. Nothing here needs to change.

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { activeOccasion, seenKey, type Occasion } from "@/content/occasions";

const SHOW_AFTER_MS = 700;

function alreadySeen(o: Occasion): boolean {
  try {
    return window.localStorage.getItem(seenKey(o)) === "seen";
  } catch {
    return false;
  }
}

function rememberSeen(o: Occasion) {
  try {
    window.localStorage.setItem(seenKey(o), "seen");
  } catch {
    /* private mode or blocked storage: the poster simply shows again next visit */
  }
}

export default function FestiveGreeting() {
  const pathname = usePathname();
  const router = useRouter();
  const [occasion, setOccasion] = useState<Occasion | null>(null);

  useEffect(() => {
    const o = activeOccasion();
    if (!o || alreadySeen(o)) return;
    const t = setTimeout(() => setOccasion(o), SHOW_AFTER_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!occasion) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occasion]);

  function close() {
    if (occasion) rememberSeen(occasion);
    setOccasion(null);
  }

  function shop() {
    const href = occasion?.href ?? "/search";
    close();
    router.push(href);
  }

  if (!occasion || pathname.startsWith("/checkout")) return null;

  return (
    <div className="greeting-backdrop" onClick={close} role="presentation">
      <div
        className="greeting-poster"
        role="dialog"
        aria-modal="true"
        aria-label="A festive greeting from Vaishnora"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="greeting-close" onClick={close} aria-label="Close greeting" autoFocus>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>

        <button type="button" className="greeting-poster-link" onClick={shop} aria-label="Open the shop">
          <picture>
            {occasion.posterWebp && <source srcSet={occasion.posterWebp} type="image/webp" />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={occasion.poster} alt={occasion.alt} width={occasion.width} height={occasion.height} />
          </picture>
        </button>
      </div>
    </div>
  );
}
