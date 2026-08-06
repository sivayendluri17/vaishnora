"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/lib/products";
import { formatINR } from "@/lib/format";

// Your business contact links
const WHATSAPP_NUMBER_URL = "https://wa.me/message/SKY2OPYXT4YYH1";
const INSTAGRAM_URL =
  "https://www.instagram.com/vaishnora_?igsh=MXdibnFsYWhsYjNhNw==&utm_source=ig_contact_invite";

export default function AddToCart({ product }: { product: Product }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Pre-filled enquiry text
  const productUrl =
    typeof window !== "undefined" ? window.location.href : `https://vaishnora.shop/product/${product.id}`;
  const orderMessage =
    `Hi Vaishnora! I'd like to order this:\n\n` +
    `${product.name}\n` +
    `${formatINR(product.price)}\n` +
    `${productUrl}`;

  // WhatsApp supports a pre-filled text param
  const whatsappHref = `${WHATSAPP_NUMBER_URL}?text=${encodeURIComponent(orderMessage)}`;

  function orderViaInstagram() {
    // Instagram links can't pre-fill DMs, so copy the message and open the profile
    navigator.clipboard?.writeText(orderMessage).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 4000);
    window.open(INSTAGRAM_URL, "_blank", "noopener,noreferrer");
  }

  return (
    <div style={{ display: "grid", gap: "0.9rem" }}>
      {/* Cart row */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <button
          className="btn btn-primary"
          onClick={() => {
            add(product);
            setAdded(true);
            setTimeout(() => setAdded(false), 1800);
          }}
        >
          {added ? "Added to cart ✦" : "Add to cart"}
        </button>
        <Link href="/cart" className="btn btn-outline">View cart</Link>
      </div>

      {/* Order-now row (until online payments are live) */}
      <div style={{ display: "grid", gap: "0.6rem" }}>
        <span style={{ fontSize: "0.78rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--gold-deep)" }}>
          Order directly
        </span>
        <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-order-wa"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ marginRight: "0.5rem" }}>
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 004.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm5.8 14.13c-.24.68-1.4 1.3-1.94 1.38-.5.07-1.13.1-1.82-.11-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.8-4.17-4.94-4.36-.15-.19-1.19-1.58-1.19-3.01 0-1.43.75-2.14 1.02-2.43.27-.29.58-.36.78-.36.19 0 .39 0 .56.01.18.01.42-.07.66.5.24.59.83 2.02.9 2.17.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.28-.12.55.16.27.72 1.19 1.55 1.93 1.06.95 1.96 1.24 2.24 1.38.28.14.44.12.6-.07.17-.19.69-.8.87-1.08.18-.27.36-.22.6-.13.24.09 1.55.73 1.82.86.27.14.44.2.5.31.07.12.07.66-.17 1.34z"/>
            </svg>
            Order on WhatsApp
          </a>
          <button onClick={orderViaInstagram} className="btn btn-order-ig">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: "0.5rem" }}>
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
            </svg>
            Order on Instagram
          </button>
        </div>
        {copied && (
          <span style={{ fontSize: "0.82rem", color: "var(--maroon)" }}>
            Order details copied — paste them in the Instagram chat ✦
          </span>
        )}
      </div>
    </div>
  );
}
