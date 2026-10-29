"use client";

// Small round button that appears after the shopper has scrolled a long way
// and jumps back to the top. Phone only (CSS): long product lists are a
// thumb-scroll marathon there, while desktop has a scrollbar.

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function BackToTop() {
  const [show, setShow] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 900);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // Checkout has its own sticky pay bar in that corner.
  if (pathname.startsWith("/checkout")) return null;
  return (
    <button
      type="button"
      className={`back-to-top ${show ? "show" : ""}`}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      tabIndex={show ? 0 : -1}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 14 6-6 6 6" /></svg>
    </button>
  );
}
