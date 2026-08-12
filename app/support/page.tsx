"use client";

import { useState } from "react";
import Link from "next/link";

// Vaishnora support WhatsApp (international format, digits only)
const SUPPORT_WHATSAPP = "17799020081"; // +1 (779) 902-0081

export default function SupportPage() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!message.trim()) { setError("Please describe how we can help."); return; }

    const text =
      `Hi Vaishnora support 🪔\n\n` +
      `Name: ${name}\n\n` +
      `${message}`;

    // Save the request to the DB (best-effort), then open WhatsApp
    try {
      await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, message }),
      });
    } catch { /* don't block on save */ }

    window.open(`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    setSent(true);
  }

  if (sent) {
    return (
      <section className="section">
        <div className="container empty-state">
          <span className="eyebrow">Support</span>
          <h2>We&apos;ve received your request ✦</h2>
          <p style={{ maxWidth: "48ch", margin: "0 auto" }}>
            Thank you for reaching out. We&apos;ve opened WhatsApp so you can send your message directly —
            our team will respond as soon as possible. We&apos;re already working on your request. 🙏
          </p>
          <Link href="/search" className="btn btn-gold" style={{ marginTop: "1rem" }}>Continue shopping</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: "620px" }}>
        <span className="eyebrow">Customer support</span>
        <h2>How can we help?</h2>
        <p style={{ color: "#6b5560" }}>
          Send us a message and we&apos;ll get back to you on WhatsApp. Questions about an order,
          sizing, fabrics, or anything else — we&apos;re here.
        </p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <form onSubmit={submit} className="summary-card" style={{ marginTop: "1rem" }}>
          <div className="field">
            <label htmlFor="s-name">Your name</label>
            <input id="s-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" />
          </div>
          <div className="field">
            <label htmlFor="s-msg">How can we help?</label>
            <textarea id="s-msg" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your question or request…" />
          </div>
          <button className="btn btn-primary" style={{ display: "block", width: "100%" }}>
            Send via WhatsApp
          </button>
        </form>
      </div>
    </section>
  );
}
