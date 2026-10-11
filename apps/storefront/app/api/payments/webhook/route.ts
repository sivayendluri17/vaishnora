// Razorpay webhook: the source of truth for "was this paid".
//
// The browser handler (verify route) is the fast path. If the shopper's phone
// dies or the tab closes right after paying, Razorpay still calls this, and
// retries for 24 hours until we answer 200. Marking paid is idempotent, so
// both paths can run in any order.
//
// Dashboard setup: Settings > Webhooks > Add, URL https://vaishnora.shop/api/payments/webhook,
// secret = RAZORPAY_WEBHOOK_SECRET, events: payment.captured, payment.failed, order.paid.

import { NextResponse } from "next/server";
import { markOrderPaid, markOrderPaymentFailed } from "@vaishnora/core/orders";
import { verifyWebhookSignature, webhookConfigured } from "@vaishnora/core/payments";
import { notifyOrderPaid } from "@vaishnora/core/order-notify";

export const dynamic = "force-dynamic";

type PaymentEntity = { id: string; order_id?: string | null; status?: string; error_description?: string | null; error_reason?: string | null };
type WebhookBody = {
  event?: string;
  payload?: { payment?: { entity?: PaymentEntity }; order?: { entity?: { id: string } } };
};

export async function POST(req: Request) {
  if (!webhookConfigured()) {
    console.error("webhook: RAZORPAY_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  // The signature covers the exact bytes Razorpay sent, so read the body raw.
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature"))) {
    console.warn("webhook: bad signature");
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let body: WebhookBody;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid body." }, { status: 400 }); }

  const payment = body.payload?.payment?.entity;
  const orderId = payment?.order_id ?? body.payload?.order?.entity?.id ?? null;

  switch (body.event) {
    case "payment.captured":
    case "order.paid": {
      if (!payment?.id || !orderId) return NextResponse.json({ ok: true, ignored: "no order" });
      const r = await markOrderPaid(orderId, payment.id);
      if (r.outcome === "paid") await notifyOrderPaid(r.orderId);
      if (r.outcome === "conflict") console.error(`webhook: order ${r.orderId} already paid by ${r.existingPaymentId}, got ${payment.id}`);
      if (r.outcome === "not_found") console.warn(`webhook: no order for razorpay order ${orderId}`);
      return NextResponse.json({ ok: true, outcome: r.outcome });
    }
    case "payment.failed": {
      if (!orderId) return NextResponse.json({ ok: true, ignored: "no order" });
      const reason = payment?.error_description || payment?.error_reason || "Payment failed";
      await markOrderPaymentFailed(orderId, reason);
      return NextResponse.json({ ok: true, outcome: "failed" });
    }
    default:
      return NextResponse.json({ ok: true, ignored: body.event ?? "unknown" });
  }
}
