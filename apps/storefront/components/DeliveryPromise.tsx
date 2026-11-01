"use client";

// The delivery message, in three sizes:
//   product  - the full block under the price: both options with dates,
//              a Details note for each, and the deliver-to line
//   card     - one line on a shop card: "Reaches you by Mon, 9 Nov"
//   cart     - one line in the cart summary
//
// Dates are worked out in the browser after mount. Product and home pages
// are cached as HTML for minutes, so a date baked into the HTML would go
// stale; until mount the text says "within 8 days", which is always true.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DELIVERY, DELIVERY_NOTE_FOOTER, deliveryPromises, type DeliveryOption, type DeliveryPromise as Promise_,
} from "@vaishnora/core/delivery";

type Addr = { fullName: string; city: string; pincode: string };

function usePromises(): Promise_[] | null {
  const [promises, setPromises] = useState<Promise_[] | null>(null);
  useEffect(() => { setPromises(deliveryPromises()); }, []);
  return promises;
}

export default function DeliveryPromise({ variant }: { variant: "product" | "card" | "cart" }) {
  const promises = usePromises();
  const regular = promises?.[0];
  const priority = promises?.[1];

  if (variant === "card") {
    return (
      <span className="card-delivery">
        <TruckIcon />
        <span>{regular ? <>Reaches you by <b>{regular.short}</b></> : <>Reaches you within <b>{DELIVERY.regular.days} days</b></>}</span>
      </span>
    );
  }

  if (variant === "cart") {
    return (
      <span className="cart-delivery">
        <span><TruckIcon /><span>Regular ₹{DELIVERY.regular.fee} · reaches you by <b>{regular ? regular.short : `${DELIVERY.regular.days} days from today`}</b></span></span>
        <small>Priority available at checkout</small>
      </span>
    );
  }

  return <ProductBlock regular={regular} priority={priority} />;
}

function TruckIcon() {
  return (
    <svg className="delivery-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" />
    </svg>
  );
}

function ProductBlock({ regular, priority }: { regular?: Promise_; priority?: Promise_ }) {
  const [open, setOpen] = useState<DeliveryOption | null>(null);
  const [addr, setAddr] = useState<Addr | null | undefined>(undefined); // undefined = not asked yet
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/account/default-address")
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setAddr(d?.address && typeof d.address.fullName === "string" ? d.address : null); })
      .catch(() => { if (!cancelled) setAddr(null); });
    return () => { cancelled = true; };
  }, []);

  const first = addr?.fullName?.trim().split(" ")[0] || "you";
  const detailsFor = (option: DeliveryOption) => (
    <button type="button" className="dp-details" aria-expanded={open === option} onClick={() => setOpen(open === option ? null : option)}>Details</button>
  );

  return (
    <div className="delivery-promise">
      <p className="dp-line">
        <b>₹{DELIVERY.regular.fee} delivery</b>, reaches you by{" "}
        <strong>{regular ? regular.long : `${DELIVERY.regular.days} days from today`}</strong>. {detailsFor("regular")}
      </p>
      <p className="dp-line">
        Or <b>{DELIVERY.priority.name}</b>, reaches you by{" "}
        <strong>{priority ? priority.long : `${DELIVERY.priority.days} days from today`}</strong>. {detailsFor("priority")}
      </p>

      {open && (
        <div className="dp-note" role="note">
          <div className="dp-note-head">
            <strong>{DELIVERY[open].name}, ₹{DELIVERY[open].fee} per order</strong>
            <button type="button" className="dp-note-close" aria-label="Close" onClick={() => setOpen(null)}>×</button>
          </div>
          <p>{DELIVERY[open].note}</p>
          <p className="dp-note-foot">{DELIVERY_NOTE_FOOTER}</p>
        </div>
      )}

      <p className="dp-to">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0Z" /><circle cx="12" cy="10" r="3" />
        </svg>
        {addr ? (
          <Link href="/account/addresses">Deliver to {first} – {addr.city} {addr.pincode}</Link>
        ) : (
          <span>
            Delivered anywhere in India
            {addr === null && <> · <Link href={`/login?next=${encodeURIComponent(pathname)}`}>Sign in</Link> to see your address</>}
          </span>
        )}
      </p>
    </div>
  );
}
