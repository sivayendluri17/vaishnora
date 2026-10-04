"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { STOREFRONT_URL } from "@vaishnora/core/urls";

const NAV = [
  { href: "/admin", label: "Catalog", match: (p: string) => p === "/admin" || p.startsWith("/admin/products") },
  { href: "/admin/metrics", label: "Metrics", match: (p: string) => p.startsWith("/admin/metrics") },
  { href: "/admin/alarms", label: "Alarms", match: (p: string) => p.startsWith("/admin/alarms") },
];

export default function AdminHeader() {
  const pathname = usePathname() ?? "";

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.assign(STOREFRONT_URL);
  }

  return (
    <header className="admin-bar">
      <Link href="/admin" className="admin-bar-brand">
        <Image src="/logo-small.jpg" alt="Vaishnora" width={36} height={36} />
        <span>Vaishnora <em>Admin</em></span>
      </Link>
      <nav className="ops-tabs admin-bar-nav" aria-label="Admin">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={`ops-tab ${n.match(pathname) ? "is-active" : ""}`}>{n.label}</Link>
        ))}
        <a className="ops-tab ops-tab-ext" href={STOREFRONT_URL} target="_blank" rel="noreferrer">View store ↗</a>
      </nav>
      <div className="admin-bar-user">
        <button type="button" className="ops-tab" onClick={signOut}>Sign out</button>
      </div>
    </header>
  );
}
