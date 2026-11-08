"use client";

// Festive poster shown the first time a shopper opens the site while a
// festival campaign is on. It appears once per browser (closing it is
// remembered), can be closed with the cross, the backdrop or Escape, and
// switches itself off after the last campaign day so no deploy is needed to
// take it down. Tapping the poster opens the shop. Never shown on checkout:
// nothing should get between a customer and the Pay button.
//
// To run a new greeting later, change GREETING below (new id, dates, poster)
// and drop the new poster files into apps/storefront/public/festive/.

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export const GREETING = {
  id: "diwali-2026",
  // Indian calendar days, inclusive. Diwali 2026 is 8 November; Bhai Dooj 10th.
  from: "2026-11-08",
  until: "2026-11-11",
  // Poster: same picture as WebP (smaller) with a JPEG fallback, 1000 x 1094.
  poster: "/festive/diwali-2026.jpg",
  posterWebp: "/festive/diwali-2026.webp",
  alt: "Vaishnora wishes you a Happy Diwali. May this Diwali bring light to your home, joy to your heart, and prosperity to your life. Celebrate the festive season with sarees, dresses, ethnic wear, jewellery and accessories. Shop now at vaishnora.shop.",
  href: "/search",
};

const SHOW_AFTER_MS = 700;

/** Today's date in India as YYYY-MM-DD, whatever the shopper's device clock zone. */
export function indianToday(now = Date.now()): string {
  return new Date(now + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function greetingIsOn(today = indianToday()): boolean {
  return today >= GREETING.from && today <= GREETING.until;
}

const storageKey = `vaishnora_greeting_${GREETING.id}`;

function alreadySeen(): boolean {
  try {
    return window.localStorage.getItem(storageKey) === "seen";
  } catch {
    return false;
  }
}

function rememberSeen() {
  try {
    window.localStorage.setItem(storageKey, "seen");
  } catch {
    /* private mode or blocked storage: the poster simply shows again next visit */
  }
}

export default function FestiveGreeting() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!greetingIsOn() || alreadySeen()) return;
    const t = setTimeout(() => setOpen(true), SHOW_AFTER_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  function close() {
    rememberSeen();
    setOpen(false);
  }

  function shop() {
    close();
    router.push(GREETING.href);
  }

  if (!open || pathname.startsWith("/checkout")) return null;

  return (
    <div className="greeting-backdrop" onClick={close} role="presentation">
      <div
        className="greeting-poster"
        role="dialog"
        aria-modal="true"
        aria-label="Happy Diwali from Vaishnora"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="greeting-close" onClick={close} aria-label="Close greeting" autoFocus>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>

        <button type="button" className="greeting-poster-link" onClick={shop} aria-label="Open the shop">
          <picture>
            <source srcSet={GREETING.posterWebp} type="image/webp" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={GREETING.poster} alt={GREETING.alt} width={1000} height={1094} />
          </picture>
        </button>
      </div>
    </div>
  );
}
