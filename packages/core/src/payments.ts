// Razorpay Standard Checkout, server side only. Talks to the REST API directly
// (four calls, Basic auth, 10 s timeout); the official SDK's list call returned
// nothing for fresh orders, which broke the timeout-recovery path.
//
// Keys come from the environment and never leave the server:
//   RAZORPAY_KEY_ID          public key, also handed to the browser to open the popup
//   RAZORPAY_KEY_SECRET      signs orders and verifies payment signatures
//   RAZORPAY_WEBHOOK_SECRET  set in the Razorpay dashboard when creating the webhook
//
// What Razorpay guarantees: one order can be paid at most once. What we have
// to guarantee: one intended purchase maps to one Razorpay order (see
// apps/storefront/app/api/payments/create-order), and "mark as paid" is safe
// to repeat (see orders.ts markOrderPaid).

import { createHmac, timingSafeEqual } from "node:crypto";

const API = "https://api.razorpay.com/v1";
const TIMEOUT_MS = 10_000;

export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID ?? "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "";
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";

export function razorpayConfigured(): boolean {
  return Boolean(RAZORPAY_KEY_ID && KEY_SECRET);
}

export class RazorpayError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
    this.name = "RazorpayError";
  }
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  if (!razorpayConfigured()) throw new RazorpayError("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set", 0);
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      authorization: "Basic " + Buffer.from(`${RAZORPAY_KEY_ID}:${KEY_SECRET}`).toString("base64"),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: { code?: string; description?: string } } & T;
  if (!res.ok) {
    throw new RazorpayError(json.error?.description || `Razorpay ${method} ${path} failed (${res.status})`, res.status, json.error?.code);
  }
  return json;
}

export type RazorpayOrderSummary = { id: string; amount: number; currency: string; status: "created" | "attempted" | "paid" };
type OrderJson = { id: string; amount: number | string; currency: string; status: RazorpayOrderSummary["status"]; receipt?: string | null };

function summary(o: OrderJson): RazorpayOrderSummary {
  return { id: o.id, amount: Number(o.amount), currency: o.currency, status: o.status };
}

/**
 * Create a Razorpay order. `receipt` is our own orders.id: if this call times
 * out after Razorpay created the order, the next attempt finds it by receipt
 * instead of creating a second one.
 */
export async function createRazorpayOrder(input: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrderSummary> {
  const o = await call<OrderJson>("POST", "/orders", {
    amount: input.amountPaise,
    currency: "INR",
    receipt: input.receipt,
    notes: input.notes,
  });
  return summary(o);
}

/** The Razorpay order previously created for one of our orders, if any. */
export async function findRazorpayOrderByReceipt(receipt: string): Promise<RazorpayOrderSummary | null> {
  const res = await call<{ items?: OrderJson[] }>("GET", `/orders?receipt=${encodeURIComponent(receipt)}&count=1`);
  const o = res.items?.[0];
  return o && o.receipt === receipt ? summary(o) : null;
}

export async function fetchRazorpayOrder(orderId: string): Promise<RazorpayOrderSummary> {
  return summary(await call<OrderJson>("GET", `/orders/${encodeURIComponent(orderId)}`));
}

export type RazorpayPaymentSummary = {
  id: string;
  orderId: string | null;
  amount: number;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  method: string;
};

export async function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPaymentSummary> {
  const p = await call<{ id: string; order_id?: string | null; amount: number | string; status: RazorpayPaymentSummary["status"]; method?: string }>(
    "GET", `/payments/${encodeURIComponent(paymentId)}`
  );
  return { id: p.id, orderId: p.order_id ?? null, amount: Number(p.amount), status: p.status, method: String(p.method ?? "") };
}

function hmacHex(secret: string, data: string): string {
  return createHmac("sha256", secret).update(data).digest("hex");
}

/** Constant-time compare so a wrong signature takes as long as a right one. */
function safeEqualHex(a: string, b: string): boolean {
  if (!/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b) || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

/**
 * Checkout success handler signature: HMAC-SHA256(order_id + "|" + payment_id)
 * with the key secret. True only when Razorpay really produced this payment
 * for this order.
 */
export function verifyPaymentSignature(input: { orderId: string; paymentId: string; signature: string }): boolean {
  if (!KEY_SECRET) return false;
  const expected = hmacHex(KEY_SECRET, `${input.orderId}|${input.paymentId}`);
  return safeEqualHex(expected, input.signature);
}

export function webhookConfigured(): boolean {
  return Boolean(WEBHOOK_SECRET);
}

/** Webhook signature: HMAC-SHA256 of the raw request body with the webhook secret. */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!WEBHOOK_SECRET || !signature) return false;
  return safeEqualHex(hmacHex(WEBHOOK_SECRET, rawBody), signature);
}
