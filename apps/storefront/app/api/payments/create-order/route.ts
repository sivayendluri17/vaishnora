// Step 1 of online payment: price the cart on the server and create (or reuse)
// a Razorpay order for it.
//
// The browser sends only product ids, quantities and the address. Prices come
// from the database, so nothing the shopper can edit changes the amount.
//
// One intended purchase = one Razorpay order. The browser keeps an attempt id
// for the current cart; sending it again returns the same Razorpay order, so
// double taps, refreshes and "it hung, try again" never create a second order
// (Razorpay allows at most one successful payment per order). A changed cart
// or address gets a new attempt, and the old one is marked abandoned.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { verifyToken, COOKIE_NAME } from "@vaishnora/core/auth";
import { getActiveProduct } from "@vaishnora/core/products-db";
import { DELIVERY_FEE_INR, MAX_QTY_PER_ITEM, MIN_ONLINE_PAYMENT_PAISE, toPaise, unitPrice } from "@vaishnora/core/pricing";
import {
  createOrder, findOrderByAttempt, markOrderAbandoned, parseOrderAddress,
  reopenOrderPayment, setRazorpayOrderId, type OrderItem,
} from "@vaishnora/core/orders";
import {
  RAZORPAY_KEY_ID, createRazorpayOrder, fetchRazorpayOrder, findRazorpayOrderByReceipt, razorpayConfigured,
  type RazorpayOrderSummary,
} from "@vaishnora/core/payments";

export const dynamic = "force-dynamic";

/** How long a pending attempt stays reusable before a fresh order is made. */
const ATTEMPT_MAX_AGE_MS = 2 * 60 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ItemInput = { productId?: unknown; qty?: unknown; colour?: unknown };

export async function POST(req: Request) {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const session = await verifyToken(token);
  if (!session) return NextResponse.json({ error: "Please sign in to pay online." }, { status: 401 });

  if (!razorpayConfigured()) {
    console.error("create-order: RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set");
    return NextResponse.json({ error: "Online payment is not available right now. Please order via WhatsApp." }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
  }
  const parsed = parseOrderAddress(body.address);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { address } = parsed;

  // Price every line from the database.
  const items: OrderItem[] = [];
  const seen = new Set<string>();
  for (const raw of body.items as ItemInput[]) {
    const productId = String(raw?.productId ?? "");
    const qty = Number(raw?.qty);
    if (!UUID_RE.test(productId) || seen.has(productId)) return NextResponse.json({ error: "Your cart looks out of date. Please refresh and try again." }, { status: 400 });
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_ITEM) return NextResponse.json({ error: `Quantity must be between 1 and ${MAX_QTY_PER_ITEM}.` }, { status: 400 });
    seen.add(productId);
    const product = await getActiveProduct(productId);
    if (!product) return NextResponse.json({ error: "An item in your cart is no longer available. Please remove it and try again." }, { status: 400 });
    if (!product.inStock) return NextResponse.json({ error: `${product.name} is out of stock. Please remove it and try again.` }, { status: 400 });
    const colour = typeof raw.colour === "string" ? raw.colour.trim().slice(0, 60) : product.colors?.[0]?.name ?? null;
    items.push({ productId, name: product.name, colour: colour || null, qty, price: unitPrice(product) });
  }
  const total = items.reduce((n, i) => n + i.price * i.qty, 0) + DELIVERY_FEE_INR;
  const amountPaise = toPaise(total);
  if (amountPaise < MIN_ONLINE_PAYMENT_PAISE) return NextResponse.json({ error: "Order total is too small to pay online." }, { status: 400 });

  // Reuse the attempt the browser already started, when it still matches.
  let orderId: string | null = null;
  let knownRazorpayOrderId: string | null = null;
  let attemptId = typeof body.attemptId === "string" && UUID_RE.test(body.attemptId) ? body.attemptId : null;
  try {
    if (attemptId) {
      const existing = await findOrderByAttempt(session.sub, attemptId);
      if (existing?.paymentStatus === "paid") {
        return NextResponse.json({ alreadyPaid: true, orderId: existing.id }, { status: 409 });
      }
      const fresh = existing && Date.now() - new Date(existing.createdAt).getTime() < ATTEMPT_MAX_AGE_MS;
      const sameCart = existing && existing.total === total;
      if (existing && fresh && sameCart && (existing.paymentStatus === "pending" || existing.paymentStatus === "failed")) {
        orderId = existing.id;
        knownRazorpayOrderId = existing.razorpayOrderId;
        if (existing.paymentStatus === "failed") await reopenOrderPayment(existing.id);
      } else {
        if (existing && existing.paymentStatus !== "abandoned") await markOrderAbandoned(existing.id);
        attemptId = null;
      }
    }
    if (!orderId) {
      attemptId = randomUUID();
      orderId = await createOrder({ userId: session.sub, address, items, total, channel: "online", paymentAttemptId: attemptId });
    }
  } catch (err) {
    console.error("create-order: database error:", err);
    return NextResponse.json({ error: "Could not save your order. Please try again in a moment. You have not been charged." }, { status: 500 });
  }

  // Create the Razorpay order, or pick up the one a timed-out earlier call made.
  let rzp: RazorpayOrderSummary | null = null;
  try {
    // Known id: fetch it directly. Unknown id (earlier call timed out): the
    // receipt search is eventually consistent, so it may miss and we create a
    // fresh order; the orphan can never be paid because no browser has its id.
    rzp = knownRazorpayOrderId ? await fetchRazorpayOrder(knownRazorpayOrderId) : await findRazorpayOrderByReceipt(orderId);
    if (rzp && rzp.status === "paid") {
      // Paid at Razorpay but our verify/webhook has not landed yet: do not open a new popup.
      return NextResponse.json({ alreadyPaid: true, orderId }, { status: 409 });
    }
    if (!rzp) {
      rzp = await createRazorpayOrder({
        amountPaise,
        receipt: orderId,
        notes: { vaishnora_order_id: orderId, customer: address.customerName, mobile: address.mobile },
      });
    }
    await setRazorpayOrderId(orderId, rzp.id);
  } catch (err) {
    console.error("create-order: Razorpay error:", err);
    return NextResponse.json({ error: "Could not reach the payment service. Please try again in a moment." }, { status: 502 });
  }

  if (rzp.amount !== amountPaise) {
    // Should never happen: the amount is fixed when the Razorpay order is made and the cart was checked above.
    console.error(`create-order: amount mismatch for ${orderId}: razorpay ${rzp.amount}, cart ${amountPaise}`);
    await markOrderAbandoned(orderId);
    return NextResponse.json({ error: "Your cart changed. Please try again." }, { status: 409 });
  }

  return NextResponse.json({
    attemptId,
    orderId,
    razorpayOrderId: rzp.id,
    amount: rzp.amount,
    currency: rzp.currency,
    keyId: RAZORPAY_KEY_ID,
    prefill: { name: address.customerName, contact: address.mobile },
  });
}
