// Step 1 of online payment: price the cart on the server and create (or reuse)
// a payment attempt with its Razorpay order.
//
// The browser sends only product ids, quantities and the address. Prices come
// from the database, so nothing the shopper can edit changes the amount.
//
// One intended purchase = one attempt = one Razorpay order. The browser keeps
// the attempt id for the current cart; sending it again returns the same
// Razorpay order, so double taps, refreshes and "it hung, try again" never
// create a second order (Razorpay allows at most one successful payment per
// order). A changed cart or address gets a new attempt, and the old one is
// marked abandoned. Nothing is written to `orders` here: that happens only
// when the payment is confirmed (verify route or webhook).

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@vaishnora/core/auth";
import { getActiveProduct } from "@vaishnora/core/products-db";
import { DELIVERY_FEE_INR, MAX_QTY_PER_ITEM, MIN_ONLINE_PAYMENT_PAISE, toPaise, unitPrice } from "@vaishnora/core/pricing";
import { parseOrderAddress, type OrderItem } from "@vaishnora/core/orders";
import { needsSize, variantKey } from "@vaishnora/core/cart";
import {
  abandonUnsentAttempts, createAttempt, findAttempt, markAttemptAbandoned, reopenAttempt, setAttemptRazorpayOrderId,
} from "@vaishnora/core/payment-attempts";
import {
  RAZORPAY_KEY_ID, createRazorpayOrder, fetchRazorpayOrder, findRazorpayOrderByReceipt, razorpayConfigured,
  type RazorpayOrderSummary,
} from "@vaishnora/core/payments";

export const dynamic = "force-dynamic";

/** How long a pending attempt stays reusable before a fresh one is made. */
const ATTEMPT_MAX_AGE_MS = 2 * 60 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ItemInput = { productId?: unknown; qty?: unknown; colour?: unknown; size?: unknown };

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
    const colourIn = typeof raw?.colour === "string" ? raw.colour.trim().slice(0, 60) : "";
    const sizeIn = typeof raw?.size === "string" ? raw.size.trim().slice(0, 20) : "";
    const key = variantKey(productId, { colour: colourIn, size: sizeIn });
    if (!UUID_RE.test(productId) || seen.has(key)) return NextResponse.json({ error: "Your cart looks out of date. Please refresh and try again." }, { status: 400 });
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_ITEM) return NextResponse.json({ error: `Quantity must be between 1 and ${MAX_QTY_PER_ITEM}.` }, { status: 400 });
    seen.add(key);
    const product = await getActiveProduct(productId);
    if (!product) return NextResponse.json({ error: "An item in your cart is no longer available. Please remove it and try again." }, { status: 400 });
    if (!product.inStock) return NextResponse.json({ error: `${product.name} is out of stock. Please remove it and try again.` }, { status: 400 });
    // Colour: the one chosen if the product still has it, else its first colour.
    const colour = (colourIn && product.colors?.some((c) => c.name === colourIn) ? colourIn : product.colors?.[0]?.name) ?? null;
    // Size: required for sized products and must be one the product offers.
    let size: string | null = null;
    if (needsSize(product)) {
      if (!product.sizes.includes(sizeIn)) return NextResponse.json({ error: `Please choose a size for ${product.name}.` }, { status: 400 });
      size = sizeIn;
    }
    items.push({ productId, name: product.name, colour, size, qty, price: unitPrice(product) });
  }
  const total = items.reduce((n, i) => n + i.price * i.qty, 0) + DELIVERY_FEE_INR;
  const amountPaise = toPaise(total);
  if (amountPaise < MIN_ONLINE_PAYMENT_PAISE) return NextResponse.json({ error: "Order total is too small to pay online." }, { status: 400 });

  // Reuse the attempt the browser already started, when it still matches.
  let attemptId: string | null = typeof body.attemptId === "string" && UUID_RE.test(body.attemptId) ? body.attemptId : null;
  let knownRazorpayOrderId: string | null = null;
  try {
    if (attemptId) {
      const existing = await findAttempt(session.sub, attemptId);
      if (existing?.status === "paid") {
        return NextResponse.json({ alreadyPaid: true, orderId: existing.orderId }, { status: 409 });
      }
      const fresh = existing && Date.now() - new Date(existing.createdAt).getTime() < ATTEMPT_MAX_AGE_MS;
      const sameCart = existing && existing.total === total;
      if (existing && fresh && sameCart && (existing.status === "pending" || existing.status === "failed")) {
        knownRazorpayOrderId = existing.razorpayOrderId;
        if (existing.status === "failed") await reopenAttempt(existing.id);
      } else {
        if (existing && existing.status !== "abandoned") await markAttemptAbandoned(existing.id);
        attemptId = null;
      }
    }
    if (!attemptId) {
      await abandonUnsentAttempts(session.sub);
      attemptId = await createAttempt({ userId: session.sub, address, items, total });
    }
  } catch (err) {
    console.error("create-order: database error:", err);
    return NextResponse.json({ error: "Could not start the payment. Please try again in a moment. You have not been charged." }, { status: 500 });
  }

  // Create the Razorpay order, or pick up the one a timed-out earlier call made.
  let rzp: RazorpayOrderSummary | null = null;
  try {
    // Known id: fetch it directly. Unknown id (earlier call timed out): the
    // receipt search is eventually consistent, so it may miss and we create a
    // fresh order; the orphan can never be paid because no browser has its id.
    rzp = knownRazorpayOrderId ? await fetchRazorpayOrder(knownRazorpayOrderId) : await findRazorpayOrderByReceipt(attemptId);
    if (rzp && rzp.status === "paid") {
      // Paid at Razorpay but our verify/webhook has not landed yet: do not open a new popup.
      return NextResponse.json({ alreadyPaid: true, orderId: null }, { status: 409 });
    }
    if (!rzp) {
      rzp = await createRazorpayOrder({
        amountPaise,
        receipt: attemptId,
        notes: { vaishnora_attempt_id: attemptId, customer: address.customerName, mobile: address.mobile },
      });
    }
    await setAttemptRazorpayOrderId(attemptId, rzp.id);
  } catch (err) {
    console.error("create-order: Razorpay error:", err);
    // Hand back the attempt id so the retry reuses this attempt instead of leaving it behind.
    return NextResponse.json({ error: "Could not reach the payment service. Please try again in a moment.", attemptId }, { status: 502 });
  }

  if (rzp.amount !== amountPaise) {
    // Should never happen: the amount is fixed when the Razorpay order is made and the cart was checked above.
    console.error(`create-order: amount mismatch for attempt ${attemptId}: razorpay ${rzp.amount}, cart ${amountPaise}`);
    await markAttemptAbandoned(attemptId);
    return NextResponse.json({ error: "Your cart changed. Please try again." }, { status: 409 });
  }

  return NextResponse.json({
    attemptId,
    razorpayOrderId: rzp.id,
    amount: rzp.amount,
    currency: rzp.currency,
    keyId: RAZORPAY_KEY_ID,
    prefill: { name: address.customerName, contact: address.mobile },
  });
}
