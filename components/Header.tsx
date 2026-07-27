"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";

export default function Header() {
  const pathname = usePathname();
  const { count } = useCart();
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false); // close mobile menu on page change
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => {});
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.href = "/";
  }

  const links = [
    { href: "/", label: "Home" },
    { href: "/search", label: "Shop" },
    { href: "/cart", label: "Cart" },
  ];

  return (
    <header className="site-header">
      <div className="container nav">
        <Link href="/" className="brand" aria-label="Vaishnora home">
          <Image src="/logo-small.jpg" alt="Vaishnora logo" width={46} height={46} />
          <span>VAISHNORA</span>
        </Link>

        <button
          className="menu-toggle"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen(!open)}
        >
          <span /><span /><span />
        </button>

        <nav className={`nav-links ${open ? "open" : ""}`} aria-label="Main navigation">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={pathname === l.href ? "active" : ""}>
              {l.label}
              {l.href === "/cart" && count > 0 && <span className="cart-badge">{count}</span>}
            </Link>
          ))}
          {user ? (
            <a href="#" onClick={(e) => { e.preventDefault(); logout(); }}>
              Sign out ({user.name.split(" ")[0]})
            </a>
          ) : (
            <Link href="/login" className={pathname === "/login" ? "active" : ""}>Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}