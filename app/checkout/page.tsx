"use client";

// Protected by middleware.ts — signed-out visitors go to /login?next=/checkout.

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatINR } from "@/lib/format";
import { thumbnailFor } from "@/lib/products";

// WhatsApp Business number in international format, digits only (no +, no spaces).
// Example: +91 98765 43210  ->  "919876543210"
// NOTE: the wa.me/message/... short link does NOT support pre-filled text,
// so ordering must use the phone-number format below.
const WHATSAPP_NUMBER = "918179456749"; // Vaishnora WhatsApp Business
const DELIVERY_FEE = 80; // flat delivery charge (₹)
const INSTAGRAM_URL =
  "https://www.instagram.com/vaishnora_?igsh=MXdibnFsYWhsYjNhNw==&utm_source=ig_contact_invite";

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra",
  "Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu",
  "Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu",
  "Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
];

export default function CheckoutPage() {
  const { items, total, count, clear } = useCart();
  const grandTotal = total + DELIVERY_FEE;
  const [placed, setPlaced] = useState<null | { channel: string }>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    customerName: "", mobile: "", pincode: "",
    addressLine1: "", addressLine2: "", landmark: "",
    city: "", state: "Andhra Pradesh",
  });

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function validate(): string | null {
    if (!form.customerName.trim()) return "Name is required.";
    if (!/^\d{10}$/.test(form.mobile.replace(/\D/g, "").slice(-10))) return "A valid 10-digit mobile number is required.";
    if (!/^\d{6}$/.test(form.pincode)) return "Pincode is required (6 digits).";
    if (!form.addressLine1.trim()) return "House / building details are required.";
    if (!form.addressLine2.trim()) return "Area, street, or locality is required.";
    if (!form.city.trim()) return "Town / city is required.";
    if (!form.state) return "State is required.";
    return null;
  }

  function orderText(): string {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://vaishnora.shop";
    const lines = items.map((i) => {
      const colour = i.product.colors?.[0]?.name;
      const link = `${origin}/product/${i.product.id}`;
      return `• ${i.product.name}${colour ? ` (${colour})` : ""} × ${i.qty} — ${formatINR(i.product.price * i.qty)}\n  ${link}`;
    });
    return (
      `New order from Vaishnora 🪔\n\n` +
      `${lines.join("\n")}\n\n` +
      `Items: ${formatINR(total)}\n` +
      `Delivery: ${formatINR(DELIVERY_FEE)}\n` +
      `Total: ${formatINR(grandTotal)}\n\n` +
      `Ship to:\n` +
      `${form.customerName}\n` +
      `${form.mobile}\n` +
      `${form.addressLine1}${form.addressLine2 ? ", " + form.addressLine2 : ""}\n` +
      `${form.landmark ? form.landmark + "\n" : ""}` +
      `${form.city}, ${form.state} - ${form.pincode}`
    );
  }

  async function placeOrder(channel: "whatsapp" | "instagram") {
    setError("");
    const v = validate();
    if (v) { setError(v); return; }
    setBusy(true);

    const orderItems = items.map((i) => ({
      productId: i.product.id,
      name: i.product.name,
      colour: i.product.colors?.[0]?.name ?? null,
      qty: i.qty,
      price: i.product.price,
    }));

    // Save to DB first
    try {
      await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: form, items: orderItems, total: grandTotal, channel }),
      });
    } catch {
      // even if save fails, still let them message — don't block the sale
    }

    const text = orderText();
    if (channel === "whatsapp") {
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    } else {
      try { await navigator.clipboard?.writeText(text); } catch { /* clipboard may be blocked */ }
      // brief confirmation so the customer knows to paste in the DM
      alert("✓ Your order details are copied!\n\nInstagram will open now — tap and hold the message box, then Paste and Send.");
      window.open(INSTAGRAM_URL, "_blank", "noopener,noreferrer");
    }

    clear();
    setBusy(false);
    setPlaced({ channel });
  }

  if (placed) {
    return (
      <section className="section">
        <div className="container empty-state">
          <span className="eyebrow">Order ready</span>
          <h2>Thank you ✦</h2>
          {placed.channel === "whatsapp" ? (
            <p>
              Your order details have been sent to us on WhatsApp.
              We'll confirm and arrange delivery shortly.
            </p>
          ) : (
            <>
              <div className="ig-paste-note">
                <strong>✓ Order details copied!</strong>
                <p style={{ margin: "0.5rem 0 0" }}>
                  We've opened our Instagram. Just <strong>tap and hold the message box → Paste → Send</strong> —
                  your full order is ready to go.
                </p>
              </div>
              <p style={{ marginTop: "1rem" }}>We'll confirm and arrange delivery shortly.</p>
            </>
          )}
          <Link href="/search" className="btn btn-gold" style={{ marginTop: "1rem" }}>Continue shopping</Link>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="section">
        <div className="container empty-state">
          <h2>Nothing to check out</h2>
          <p>Your cart is empty.</p>
          <Link href="/search" className="btn btn-gold" style={{ marginTop: "1rem" }}>Browse the collection</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container">
        <span className="eyebrow">Checkout</span>
        <h2>Complete your order</h2>
        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="checkout-grid">
          {/* Address form */}
          <div className="summary-card">
            <h3 style={{ marginBottom: "1rem" }}>Delivery address</h3>
            <div className="field">
              <label htmlFor="c-name">Name</label>
              <input id="c-name" value={form.customerName} onChange={(e) => set("customerName", e.target.value)} placeholder="Enter name" />
            </div>
            <div className="field-row-2">
              <div className="field">
                <label htmlFor="c-mobile">Mobile number</label>
                <input id="c-mobile" inputMode="numeric" value={form.mobile} onChange={(e) => set("mobile", e.target.value)} placeholder="10-digit mobile number" />
              </div>
              <div className="field">
                <label htmlFor="c-pin">Pincode</label>
                <input id="c-pin" inputMode="numeric" maxLength={6} value={form.pincode} onChange={(e) => set("pincode", e.target.value.replace(/\D/g, ""))} placeholder="6-digit pincode" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="c-a1">Flat, house no., building</label>
              <input id="c-a1" value={form.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} placeholder="Flat / house no., building name" />
            </div>
            <div className="field">
              <label htmlFor="c-a2">Area, street, locality</label>
              <input id="c-a2" value={form.addressLine2} onChange={(e) => set("addressLine2", e.target.value)} placeholder="Area, street, locality" />
            </div>
            <div className="field">
              <label htmlFor="c-land">Landmark (optional)</label>
              <input id="c-land" value={form.landmark} onChange={(e) => set("landmark", e.target.value)} placeholder="Nearby landmark (optional)" />
            </div>
            <div className="field-row-2">
              <div className="field">
                <label htmlFor="c-city">Town / city</label>
                <input id="c-city" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Town / city" />
              </div>
              <div className="field">
                <label htmlFor="c-state">State</label>
                <select id="c-state" value={form.state} onChange={(e) => set("state", e.target.value)}>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Order summary */}
          <div className="summary-card checkout-summary">
            <h3 style={{ marginBottom: "1rem" }}>Order summary</h3>
            {items.map((i) => {
              const thumb = thumbnailFor(i.product);
              const colour = i.product.colors?.[0];
              return (
                <div key={i.product.id} className="checkout-item">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt={i.product.name} />
                  ) : (
                    <div className="checkout-item-swatch" style={{ background: i.product.swatch ?? "var(--parchment)" }} />
                  )}
                  <div className="checkout-item-info">
                    <strong>{i.product.name}</strong>
                    {colour && (
                      <span className="checkout-colour">
                        Colour: <span className="dot" style={{ background: colour.swatch }} /> {colour.name}
                      </span>
                    )}
                    <span className="muted">Qty: {i.qty}</span>
                    <span className="checkout-price">{formatINR(i.product.price * i.qty)}</span>
                  </div>
                </div>
              );
            })}

            <div className="summary-row"><span>Items ({count})</span><span>{formatINR(total)}</span></div>
            <div className="summary-row"><span>Delivery</span><span>{formatINR(DELIVERY_FEE)}</span></div>
            <div className="summary-row total"><span>Order total</span><span>{formatINR(grandTotal)}</span></div>

            <div style={{ display: "grid", gap: "0.7rem", marginTop: "1.2rem" }}>
              <button className="btn btn-order-wa" disabled={busy} onClick={() => placeOrder("whatsapp")}>
                {busy ? "Placing…" : "Place order via WhatsApp"}
              </button>
              <button className="btn btn-order-ig" disabled={busy} onClick={() => placeOrder("instagram")}>
                {busy ? "Placing…" : "Place order via Instagram"}
              </button>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--gold-deep)", textAlign: "center", marginTop: "0.7rem" }}>
              Online payments coming soon
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
