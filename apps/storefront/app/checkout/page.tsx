"use client";

// Protected by middleware.ts — signed-out visitors go to /login?next=/checkout.
//
// Three ways to order: pay online (Razorpay popup), or send the order over
// WhatsApp / Instagram and settle later.
//
// Online payment keeps one "attempt" per cart in sessionStorage. Retrying
// after a hang, a refresh or a closed popup sends the same attempt id, so the
// server reuses the same Razorpay order and the shopper can only be charged
// once. Changing the cart or address starts a new attempt.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useCart } from "@/context/CartContext";
import { formatINR } from "@vaishnora/core/format";
import { thumbnailFor } from "@vaishnora/core/products";
import { DELIVERY_FEE_INR } from "@vaishnora/core/pricing";

// WhatsApp Business number in international format, digits only (no +, no spaces).
// Example: +91 98765 43210  ->  "919876543210"
// NOTE: the wa.me/message/... short link does NOT support pre-filled text,
// so ordering must use the phone-number format below.
const WHATSAPP_NUMBER = "918179456749"; // Vaishnora WhatsApp Business
const INSTAGRAM_URL =
  "https://www.instagram.com/vaishnora_?igsh=MXdibnFsYWhsYjNhNw==&utm_source=ig_contact_invite";
const ATTEMPT_KEY = "vaishnora_pay_attempt_v1";

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra",
  "Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu",
  "Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu",
  "Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
];

// Minimal shape of the Razorpay checkout.js global we use.
type RazorpaySuccess = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayFailure = { error?: { code?: string; description?: string; reason?: string } };
type RazorpayInstance = { open: () => void; on: (event: "payment.failed", cb: (r: RazorpayFailure) => void) => void };
type RazorpayOptions = {
  key: string; amount: number; currency: string; order_id: string;
  name: string; description?: string; image?: string;
  prefill?: { name?: string; contact?: string; email?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  modal?: { ondismiss?: () => void; confirm_close?: boolean };
  retry?: { enabled: boolean };
  handler: (r: RazorpaySuccess) => void;
};
declare global { interface Window { Razorpay?: new (o: RazorpayOptions) => RazorpayInstance } }

type Channel = "whatsapp" | "instagram" | "online";

function readAttempt(): { id: string; fingerprint: string } | null {
  try { const raw = sessionStorage.getItem(ATTEMPT_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function writeAttempt(a: { id: string; fingerprint: string } | null) {
  try { a ? sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify(a)) : sessionStorage.removeItem(ATTEMPT_KEY); } catch { /* storage blocked */ }
}

export default function CheckoutPage() {
  const { items, total, count, clear } = useCart();
  const grandTotal = total + DELIVERY_FEE_INR;
  const [placed, setPlaced] = useState<null | { channel: Channel; orderId?: string }>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [rzpReady, setRzpReady] = useState(false);
  const paying = useRef(false); // guards against a second tap while the popup is opening

  const [form, setForm] = useState({
    customerName: "", mobile: "", pincode: "",
    addressLine1: "", addressLine2: "", landmark: "",
    city: "", state: "Andhra Pradesh",
  });

  useEffect(() => { if (window.Razorpay) setRzpReady(true); }, []);

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

  const orderItems = useMemo(() => items.map((i) => ({
    productId: i.product.id,
    name: i.product.name,
    colour: i.product.colors?.[0]?.name ?? null,
    qty: i.qty,
    price: i.product.price,
  })), [items]);

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
      `Delivery: ${formatINR(DELIVERY_FEE_INR)}\n` +
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
    setError(""); setNotice("");
    const v = validate();
    if (v) { setError(v); return; }
    setBusy(true);

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

    writeAttempt(null);
    clear();
    setBusy(false);
    setPlaced({ channel });
  }

  function paidSuccessfully(orderId?: string | null) {
    writeAttempt(null);
    clear();
    paying.current = false;
    setBusy(false);
    setPlaced({ channel: "online", orderId: orderId ?? undefined });
  }

  async function payOnline() {
    setError(""); setNotice("");
    const v = validate();
    if (v) { setError(v); return; }
    if (paying.current) return;
    if (!window.Razorpay) { setError("The payment window is still loading. Please try again in a moment."); return; }
    paying.current = true;
    setBusy(true);

    // Same cart + same address = same attempt. Anything else starts fresh.
    const fingerprint = JSON.stringify({ items: orderItems.map((i) => [i.productId, i.qty]), form });
    const saved = readAttempt();
    const attemptId = saved && saved.fingerprint === fingerprint ? saved.id : undefined;

    let data: {
      attemptId?: string; razorpayOrderId?: string; amount?: number; currency?: string;
      keyId?: string; prefill?: { name?: string; contact?: string }; error?: string;
      alreadyPaid?: boolean; orderId?: string | null;
    };
    let status = 0;
    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, address: form, items: orderItems.map((i) => ({ productId: i.productId, qty: i.qty, colour: i.colour })) }),
      });
      status = res.status;
      data = await res.json();
    } catch {
      paying.current = false; setBusy(false);
      setError("Could not reach the payment service. Please check your connection and try again. You have not been charged.");
      return;
    }

    // Already paid (a retry after success, or Razorpay confirmed before we did): nothing more to pay.
    if (status === 409 && data.alreadyPaid) { paidSuccessfully(data.orderId); return; }
    if (status === 401) { window.location.href = "/login?next=/checkout"; return; }
    if (!data.razorpayOrderId || !data.keyId || !data.amount || !data.attemptId) {
      // A failed call may still have created our order row: keep its attempt id so the retry reuses it.
      if (data.attemptId) writeAttempt({ id: data.attemptId, fingerprint });
      paying.current = false; setBusy(false);
      setError(data.error || "Could not start the payment. Please try again. You have not been charged.");
      return;
    }
    writeAttempt({ id: data.attemptId, fingerprint });

    const rzp = new window.Razorpay({
      key: data.keyId,
      amount: data.amount,
      currency: data.currency || "INR",
      order_id: data.razorpayOrderId,
      name: "Vaishnora",
      description: `${count} item${count === 1 ? "" : "s"} incl. delivery`,
      prefill: { name: data.prefill?.name, contact: data.prefill?.contact },
      notes: { vaishnora_attempt_id: data.attemptId },
      theme: { color: "#7a1230" },
      retry: { enabled: true },
      modal: {
        ondismiss: () => {
          paying.current = false;
          setBusy(false);
          setNotice("Payment cancelled. Nothing was charged. Your cart is still here when you are ready.");
        },
      },
      handler: async (r) => {
        try {
          const res = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(r),
          });
          const d = await res.json().catch(() => ({}));
          if (res.ok && d.orderId) { paidSuccessfully(d.orderId); return; }
          setError(d.error || "We could not confirm the payment yet.");
        } catch {
          setError(
            `Your payment went through (ref ${r.razorpay_payment_id}) but we could not confirm it from this device. ` +
            `Please do not pay again. We will confirm your order on WhatsApp shortly.`
          );
        }
        paying.current = false;
        setBusy(false);
      },
    });
    rzp.on("payment.failed", (r) => {
      // The popup stays open so they can try another method; just tell them why.
      setError(`Payment failed: ${r.error?.description || "the bank declined it"}. You can try again or use another method. Nothing was charged.`);
    });
    rzp.open();
  }

  if (placed) {
    return (
      <section className="section">
        <div className="container empty-state">
          <span className="eyebrow">{placed.channel === "online" ? "Payment received" : "Order ready"}</span>
          <h2>Thank you ✦</h2>
          {placed.channel === "online" ? (
            <>
              <p>Your payment is confirmed and your order is placed.</p>
              {placed.orderId && <p className="muted" style={{ fontSize: "0.85rem" }}>Order reference: {placed.orderId.slice(0, 8).toUpperCase()}</p>}
              <p>We&apos;ll confirm and arrange delivery shortly. You can see this order under <Link href="/account/orders">Your orders</Link>.</p>
            </>
          ) : placed.channel === "whatsapp" ? (
            <p>
              Your order details have been sent to us on WhatsApp.
              We&apos;ll confirm and arrange delivery shortly.
            </p>
          ) : (
            <>
              <div className="ig-paste-note">
                <strong>✓ Order details copied!</strong>
                <p style={{ margin: "0.5rem 0 0" }}>
                  We&apos;ve opened our Instagram. Just <strong>tap and hold the message box → Paste → Send</strong> —
                  your full order is ready to go.
                </p>
              </div>
              <p style={{ marginTop: "1rem" }}>We&apos;ll confirm and arrange delivery shortly.</p>
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
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" onLoad={() => setRzpReady(true)} />
      <div className="container">
        <span className="eyebrow">Checkout</span>
        <h2>Complete your order</h2>
        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="form-notice" role="status">{notice}</p>}

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
            <div className="summary-row"><span>Delivery</span><span>{formatINR(DELIVERY_FEE_INR)}</span></div>
            <div className="summary-row total"><span>Order total</span><span>{formatINR(grandTotal)}</span></div>

            <div style={{ display: "grid", gap: "0.7rem", marginTop: "1.2rem" }}>
              <button className="btn btn-order-pay" disabled={busy || !rzpReady} onClick={payOnline}>
                {busy ? "Opening payment…" : rzpReady ? `Pay ${formatINR(grandTotal)} online` : "Loading payment…"}
              </button>
              <p className="checkout-pay-hint">UPI, cards, net banking and wallets · secured by Razorpay</p>
              <p className="checkout-or">or</p>
              <button className="btn btn-order-wa" disabled={busy} onClick={() => placeOrder("whatsapp")}>
                {busy ? "Placing…" : "Place order via WhatsApp"}
              </button>
              <button className="btn btn-order-ig" disabled={busy} onClick={() => placeOrder("instagram")}>
                {busy ? "Placing…" : "Place order via Instagram"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
