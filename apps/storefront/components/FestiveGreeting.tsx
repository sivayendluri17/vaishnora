"use client";

// Festive greeting card shown the first time a shopper opens the site while
// a festival campaign is on. It appears once per browser (closing it is
// remembered), can be closed with the cross, the backdrop or Escape, and
// switches itself off after the last campaign day so no deploy is needed to
// take it down. Never shown on checkout: nothing should get between a
// customer and the Pay button.
//
// To run a new greeting later, change GREETING below (new id, dates, words).

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const GREETING = {
  id: "diwali-2026",
  // Indian calendar days, inclusive. Diwali 2026 is 8 November; Bhai Dooj 10th.
  from: "2026-11-08",
  until: "2026-11-11",
  eyebrow: "From all of us at Vaishnora",
  title: "Happy Diwali",
  line: "May your home glow with light, laughter and new beginnings. Thank you for celebrating the season with us.",
  cta: "Shop the festive edit",
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
    /* private mode or blocked storage: the card simply shows again next visit */
  }
}

export default function FestiveGreeting() {
  const pathname = usePathname();
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

  if (!open || pathname.startsWith("/checkout")) return null;

  return (
    <div className="greeting-backdrop" onClick={close} role="presentation">
      <div
        className="greeting-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="greeting-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="greeting-close" onClick={close} aria-label="Close greeting" autoFocus>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>

        <svg className="greeting-diya" viewBox="0 0 64 64" aria-hidden="true">
          <g className="flame">
            <path d="M32 8c5 7 8 11 8 17a8 8 0 0 1-16 0c0-6 3-10 8-17z" fill="#f2a33a" />
            <path d="M32 16c2.6 3.8 4 6 4 9a4 4 0 0 1-8 0c0-3 1.4-5.2 4-9z" fill="#ffe08a" />
          </g>
          <path d="M11 38h42c0 9.5-9.4 16.5-21 16.5S11 47.5 11 38z" fill="#c49a4a" />
          <path d="M7 35.5h50l-3.2 5.5H10.2z" fill="#e4c98b" />
          <path d="M19 44.5c3 3.3 7.8 5.2 13 5.2s10-1.9 13-5.2" fill="none" stroke="#9a7430" strokeWidth="1.2" strokeLinecap="round" opacity=".7" />
        </svg>

        <p className="greeting-eyebrow">{GREETING.eyebrow}</p>
        <h2 id="greeting-title" className="greeting-title">{GREETING.title}</h2>
        <p className="greeting-line">{GREETING.line}</p>

        <Link href={GREETING.href} className="btn btn-gold" onClick={close}>
          {GREETING.cta}
        </Link>
        <button type="button" className="greeting-skip" onClick={close}>
          Continue browsing
        </button>
      </div>
    </div>
  );
}
