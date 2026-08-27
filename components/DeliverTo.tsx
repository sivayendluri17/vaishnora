"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Addr = { fullName: string; city: string; pincode: string };

export default function DeliverTo() {
  const [addr, setAddr] = useState<Addr | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/account/default-address")
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setAddr(d.address); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [pathname]);

  // Not signed in or no saved address → don't show
  if (!addr) return null;

  const first = addr.fullName.split(" ")[0];

  return (
    <Link href="/account/addresses" className="deliver-to" title="Change delivery address">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/>
      </svg>
      <span className="deliver-to-text">
        <span className="deliver-to-label">Deliver to {first}</span>
        <span className="deliver-to-place">{addr.city} {addr.pincode}</span>
      </span>
    </Link>
  );
}
