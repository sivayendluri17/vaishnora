"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useCart } from "@/context/CartContext";
import CartStrip from "./CartStrip";

const INSTAGRAM_URL =
  "https://www.instagram.com/vaishnora_?igsh=MXdibnFsYWhsYjNhNw==&utm_source=ig_contact_invite";
const WHATSAPP_URL = "https://wa.me/message/SKY2OPYXT4YYH1";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { count } = useCart();
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setOpen(false);
    setAcctOpen(false);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.href = "/";
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/search?q=${encodeURIComponent(term)}` : "/search");
  }

  const shopLinks = [
    { href: "/search?cat=Sarees", label: "Sarees" },
    { href: "/search?cat=Dresses", label: "Dresses" },
    { href: "/search?cat=Ethnic Wear", label: "Ethnic Wear" },
  ];

  const drawer = (
    <>
      <div
        className={`drawer-overlay ${open ? "show" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <aside className={`drawer ${open ? "open" : ""}`} aria-label="Menu">
        <div className="drawer-head">
          <span>Menu</span>
          <button className="drawer-close" aria-label="Close menu" onClick={() => setOpen(false)}>&times;</button>
        </div>

        <nav className="drawer-nav">
          <Link href="/" className={pathname === "/" ? "active" : ""}>Home</Link>
          <Link href="/search" className={pathname === "/search" ? "active" : ""}>Shop all</Link>
          <Link href="/cart">Cart{count > 0 ? ` (${count})` : ""}</Link>

          <div className="drawer-section-label">Collections</div>
          {shopLinks.map((l) => (
            <Link key={l.href} href={l.href} className="drawer-sub">{l.label}</Link>
          ))}

          <div className="drawer-section-label">Your account</div>
          {user ? (
            <>
              <Link href="/account/orders">Your orders</Link>
              <Link href="/account/security">Login &amp; security</Link>
              <Link href="/account/addresses">Your addresses</Link>
              <Link href="/support">Customer support</Link>
              <Link href="/account/messages">Your messages</Link>
              <a href="#" onClick={(e) => { e.preventDefault(); logout(); }}>Sign out</a>
            </>
          ) : (
            <>
              <Link href="/login">Sign in</Link>
              <Link href="/register">Create account</Link>
              <Link href="/support">Customer support</Link>
            </>
          )}
        </nav>

        <div className="drawer-social">
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
            </svg>
            Instagram
          </a>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 004.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm5.8 14.13c-.24.68-1.4 1.3-1.94 1.38-.5.07-1.13.1-1.82-.11-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.8-4.17-4.94-4.36-.15-.19-1.19-1.58-1.19-3.01 0-1.43.75-2.14 1.02-2.43.27-.29.58-.36.78-.36.19 0 .39 0 .56.01.18.01.42-.07.66.5.24.59.83 2.02.9 2.17.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.28-.12.55.16.27.72 1.19 1.55 1.93 1.06.95 1.96 1.24 2.24 1.38.28.14.44.12.6-.07.17-.19.69-.8.87-1.08.18-.27.36-.22.6-.13.24.09 1.55.73 1.82.86.27.14.44.2.5.31.07.12.07.66-.17 1.34z"/>
            </svg>
            WhatsApp
          </a>
        </div>
      </aside>
    </>
  );

  return (
    <header className="site-header">
      <div className="container nav">
        <button
          className="menu-toggle"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen(!open)}
        >
          <span /><span /><span />
        </button>

        <Link href="/" className="brand" aria-label="Vaishnora home">
          <Image src="/logo-small.jpg" alt="Vaishnora logo" width={46} height={46} />
          <span>VAISHNORA</span>
        </Link>

        {/* Home · Shop · [Search] · Cart · Account */}
        <nav className="nav-links-desktop" aria-label="Main navigation">
          <Link href="/" className={pathname === "/" ? "active" : ""}>Home</Link>
          <Link href="/search" className={pathname === "/search" ? "active" : ""}>Shop</Link>

          <form className="header-search" role="search" onSubmit={onSearch}>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search sarees, dresses…"
              aria-label="Search products"
            />
            <button type="submit" aria-label="Search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
              </svg>
            </button>
          </form>

          <Link href="/cart" className={`nav-cart ${pathname === "/cart" ? "active" : ""}`}>
            Cart
            {count > 0 && <span className="cart-badge">{count}</span>}
          </Link>

          {/* Account dropdown */}
          {user ? (
            <div className="acct" onMouseLeave={() => setAcctOpen(false)}>
              <button className="acct-btn" onClick={() => setAcctOpen((o) => !o)} onMouseEnter={() => setAcctOpen(true)} aria-expanded={acctOpen}>
                <span className="acct-hello">Hello, {user.name.split(" ")[0]}</span>
                <span className="acct-label">Account ▾</span>
              </button>
              {acctOpen && (
                <div className="acct-menu">
                  <Link href="/account/orders">Your orders</Link>
                  <Link href="/account/security">Login &amp; security</Link>
                  <Link href="/account/addresses">Your addresses</Link>
                  <Link href="/support">Customer support</Link>
                  <Link href="/account/messages">Your messages</Link>
                  <hr />
                  <a href="#" onClick={(e) => { e.preventDefault(); logout(); }}>Sign out</a>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className={pathname === "/login" ? "active" : ""}>Sign in</Link>
          )}
        </nav>

        {/* Cart strip — static right side, search/product pages, desktop only */}
        <CartStrip />
      </div>

      {mounted && createPortal(drawer, document.body)}
    </header>
  );
}
