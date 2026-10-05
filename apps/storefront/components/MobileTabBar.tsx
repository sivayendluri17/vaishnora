"use client";

// Phone-only bottom tab bar: Home, Shop, Cart, Account. Always within thumb
// reach, so the cart is one tap away instead of hidden in the menu. Hidden on
// wider screens (CSS), where the header nav does this job, and on checkout,
// where the only thing to do is finish the order.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/context/CartContext";

const ICON = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" />,
  shop: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  cart: <><path d="M5 7h14l-1 12H6L5 7Z" /><path d="M9 7V6a3 3 0 0 1 6 0v1" /></>,
  account: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
};

export default function MobileTabBar() {
  const pathname = usePathname() ?? "/";
  const { count } = useCart();

  // Bump the badge when the count changes, so "Add to cart" is visibly acknowledged
  // at the bottom of the screen where the shopper's thumb already is.
  const [bump, setBump] = useState(false);
  const prev = useRef(count);
  useEffect(() => {
    if (count > prev.current) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 500);
      return () => clearTimeout(t);
    }
    prev.current = count;
  }, [count]);
  useEffect(() => { prev.current = count; }, [count]);

  if (pathname.startsWith("/checkout")) return null;

  const tabs = [
    { href: "/", label: "Home", icon: ICON.home, active: pathname === "/" },
    { href: "/search", label: "Shop", icon: ICON.shop, active: pathname.startsWith("/search") || pathname.startsWith("/product") },
    { href: "/cart", label: "Cart", icon: ICON.cart, active: pathname.startsWith("/cart"), badge: count },
    { href: "/account", label: "Account", icon: ICON.account, active: pathname.startsWith("/account") || pathname === "/login" || pathname === "/register" },
  ];

  return (
    <>
      {/* keeps page content and the footer from sitting under the fixed bar */}
      <div className="tabbar-spacer" aria-hidden="true" />
      <nav className="tabbar" aria-label="Quick navigation">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className={`tabbar-item ${t.active ? "is-active" : ""}`} aria-current={t.active ? "page" : undefined}>
            <span className="tabbar-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {t.icon}
              </svg>
              {t.badge ? (
                <span className={`tabbar-badge ${bump ? "is-bump" : ""}`} aria-hidden="true">{t.badge > 99 ? "99+" : t.badge}</span>
              ) : null}
            </span>
            <span className="tabbar-label">
              {t.label}
              {t.badge ? <span className="sr-only">, {t.badge} item{t.badge === 1 ? "" : "s"}</span> : null}
            </span>
          </Link>
        ))}
      </nav>
    </>
  );
}
