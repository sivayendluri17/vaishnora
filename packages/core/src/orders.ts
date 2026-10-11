// Order persistence (Neon Postgres).
//
// Table (run the migration SQL once in Neon):
//   CREATE TABLE orders (
//     id UUID PK, user_id UUID, customer_name, mobile, pincode,
//     address_line1, address_line2, landmark, city, state,
//     items JSONB, total INTEGER, channel TEXT, created_at,
//     -- infra/db/2026-10-11-online-payments.sql:
//     payment_status TEXT, payment_attempt_id UUID, razorpay_order_id TEXT,
//     razorpay_payment_id TEXT, payment_error TEXT, paid_at TIMESTAMPTZ
//   );

import { neon } from "@neondatabase/serverless";
import { imageUrl } from "./s3";

const sql = neon(process.env.DATABASE_URL!);

export type OrderChannel = "whatsapp" | "instagram" | "online";
export type PaymentStatus = "not_required" | "pending" | "paid" | "failed" | "abandoned";

export type OrderItem = {
  productId: string;
  name: string;
  colour: string | null;
  qty: number;
  price: number;
  /** Filled in when orders are read back (current product photo), not stored. */
  imageUrl?: string | null;
  swatch?: string | null;
};

export type OrderAddress = {
  customerName: string;
  mobile: string;
  pincode: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  city: string;
  state: string;
};

/**
 * Validate and trim an address object from a request body. Returns the clean
 * address, or the message to show the shopper.
 */
export function parseOrderAddress(a: unknown): { address: OrderAddress } | { error: string } {
  const r = (a ?? {}) as Record<string, unknown>;
  const s = (k: string) => String(r[k] ?? "").trim();
  if (!s("customerName") || !s("mobile") || !s("pincode") || !s("addressLine1") || !s("city") || !s("state")) {
    return { error: "Please fill all required address fields." };
  }
  if (!/^\d{10}$/.test(s("mobile").replace(/\D/g, "").slice(-10))) return { error: "Enter a valid 10-digit mobile number." };
  if (!/^\d{6}$/.test(s("pincode"))) return { error: "Enter a valid 6-digit pincode." };
  return {
    address: {
      customerName: s("customerName").slice(0, 120),
      mobile: s("mobile").slice(0, 20),
      pincode: s("pincode"),
      addressLine1: s("addressLine1").slice(0, 200),
      addressLine2: s("addressLine2").slice(0, 200),
      landmark: s("landmark").slice(0, 120),
      city: s("city").slice(0, 80),
      state: s("state").slice(0, 80),
    },
  };
}

export async function createOrder(input: {
  userId: string | null;
  address: OrderAddress;
  items: OrderItem[];
  total: number;
  channel: OrderChannel;
  /** Online orders only. */
  paymentAttemptId?: string;
}): Promise<string> {
  const { address, items, total, channel, userId } = input;
  const paymentStatus: PaymentStatus = channel === "online" ? "pending" : "not_required";
  const rows = (await sql`
    INSERT INTO orders (
      user_id, customer_name, mobile, pincode,
      address_line1, address_line2, landmark, city, state,
      items, total, channel, payment_status, payment_attempt_id
    ) VALUES (
      ${userId}, ${address.customerName}, ${address.mobile}, ${address.pincode},
      ${address.addressLine1}, ${address.addressLine2}, ${address.landmark},
      ${address.city}, ${address.state},
      ${JSON.stringify(items)}, ${total}, ${channel}, ${paymentStatus}, ${input.paymentAttemptId ?? null}
    )
    RETURNING id
  `) as any[];
  return rows[0].id as string;
}

// ---------------------------------------------------------------- online payment

export type PaymentOrderRow = {
  id: string;
  userId: string | null;
  total: number;
  paymentStatus: PaymentStatus;
  paymentAttemptId: string | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  createdAt: string;
};

/** The order a shopper's checkout attempt already created, if any. */
export async function findOrderByAttempt(userId: string, attemptId: string): Promise<PaymentOrderRow | null> {
  const rows = (await sql`
    SELECT id, user_id AS "userId", total, payment_status AS "paymentStatus",
           payment_attempt_id AS "paymentAttemptId", razorpay_order_id AS "razorpayOrderId",
           razorpay_payment_id AS "razorpayPaymentId", created_at AS "createdAt"
    FROM orders
    WHERE user_id = ${userId} AND payment_attempt_id = ${attemptId}::uuid
  `) as PaymentOrderRow[];
  return rows[0] ?? null;
}

export async function findOrderByRazorpayOrderId(razorpayOrderId: string): Promise<PaymentOrderRow | null> {
  const rows = (await sql`
    SELECT id, user_id AS "userId", total, payment_status AS "paymentStatus",
           payment_attempt_id AS "paymentAttemptId", razorpay_order_id AS "razorpayOrderId",
           razorpay_payment_id AS "razorpayPaymentId", created_at AS "createdAt"
    FROM orders WHERE razorpay_order_id = ${razorpayOrderId}
  `) as PaymentOrderRow[];
  return rows[0] ?? null;
}

export async function setRazorpayOrderId(orderId: string, razorpayOrderId: string): Promise<void> {
  await sql`UPDATE orders SET razorpay_order_id = ${razorpayOrderId} WHERE id = ${orderId} AND razorpay_order_id IS NULL`;
}

/** The cart or address changed: the old attempt will never be paid. */
export async function markOrderAbandoned(orderId: string): Promise<void> {
  await sql`UPDATE orders SET payment_status = 'abandoned' WHERE id = ${orderId} AND payment_status = 'pending'`;
}

/**
 * Pending online orders of this shopper that never got a Razorpay order (the
 * Razorpay call failed) and are older than a minute: nobody can pay them, so
 * they must not linger as "Payment pending". Called before a new attempt is
 * created. The minute keeps a concurrent in-flight attempt out of the sweep.
 */
export async function abandonUnsentAttempts(userId: string): Promise<void> {
  await sql`
    UPDATE orders SET payment_status = 'abandoned'
    WHERE user_id = ${userId} AND channel = 'online' AND payment_status = 'pending'
      AND razorpay_order_id IS NULL AND created_at < now() - interval '1 minute'
  `;
}

export type MarkPaidResult =
  | { outcome: "paid"; orderId: string; userId: string | null }
  | { outcome: "already_paid"; orderId: string; userId: string | null }
  | { outcome: "conflict"; orderId: string; userId: string | null; existingPaymentId: string }
  | { outcome: "not_found" };

/**
 * Record a verified payment. Safe to call any number of times, from the
 * browser handler and from the webhook: the first call wins, repeats with the
 * same payment id are no-ops, and a different payment id against an order
 * that is already paid is reported as a conflict (never overwritten).
 */
export async function markOrderPaid(razorpayOrderId: string, paymentId: string): Promise<MarkPaidResult> {
  const updated = (await sql`
    UPDATE orders
    SET payment_status = 'paid', razorpay_payment_id = ${paymentId}, paid_at = now(), payment_error = NULL
    WHERE razorpay_order_id = ${razorpayOrderId} AND payment_status <> 'paid'
    RETURNING id, user_id AS "userId"
  `) as { id: string; userId: string | null }[];
  if (updated[0]) return { outcome: "paid", orderId: updated[0].id, userId: updated[0].userId };

  const existing = await findOrderByRazorpayOrderId(razorpayOrderId);
  if (!existing) return { outcome: "not_found" };
  if (existing.razorpayPaymentId === paymentId) return { outcome: "already_paid", orderId: existing.id, userId: existing.userId };
  return { outcome: "conflict", orderId: existing.id, userId: existing.userId, existingPaymentId: existing.razorpayPaymentId ?? "" };
}

/** A payment attempt failed. Only recorded while the order is still unpaid. */
export async function markOrderPaymentFailed(razorpayOrderId: string, reason: string): Promise<void> {
  await sql`
    UPDATE orders SET payment_status = 'failed', payment_error = ${reason.slice(0, 300)}
    WHERE razorpay_order_id = ${razorpayOrderId} AND payment_status IN ('pending', 'failed')
  `;
}

/** A failed attempt is being retried on the same order. */
export async function reopenOrderPayment(orderId: string): Promise<void> {
  await sql`UPDATE orders SET payment_status = 'pending' WHERE id = ${orderId} AND payment_status = 'failed'`;
}

// ---------------------------------------------------------------- account page

export type OrderRecord = {
  id: string;
  customerName: string;
  mobile: string;
  pincode: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  city: string;
  state: string;
  items: OrderItem[];
  total: number;
  channel: string;
  paymentStatus: PaymentStatus;
  paidAt: string | null;
  createdAt: string;
};

export type OrderDetail = OrderRecord & { razorpayOrderId: string | null; razorpayPaymentId: string | null };

export async function getOrderById(orderId: string): Promise<OrderDetail | null> {
  const rows = (await sql`
    SELECT id, customer_name AS "customerName", mobile, pincode,
           address_line1 AS "addressLine1", address_line2 AS "addressLine2",
           landmark, city, state, items, total, channel,
           payment_status AS "paymentStatus", paid_at AS "paidAt",
           razorpay_order_id AS "razorpayOrderId", razorpay_payment_id AS "razorpayPaymentId",
           created_at AS "createdAt"
    FROM orders WHERE id = ${orderId}
  `) as any[];
  const r = rows[0];
  if (!r) return null;
  return { ...r, items: typeof r.items === "string" ? JSON.parse(r.items) : r.items } as OrderDetail;
}

export async function getOrdersForUser(userId: string): Promise<OrderRecord[]> {
  const rows = (await sql`
    SELECT id, customer_name AS "customerName", mobile, pincode,
           address_line1 AS "addressLine1", address_line2 AS "addressLine2",
           landmark, city, state, items, total, channel,
           payment_status AS "paymentStatus", paid_at AS "paidAt",
           created_at AS "createdAt"
    FROM orders
    WHERE user_id = ${userId}
      -- Chat orders always; online orders only once paid. The cart keeps the
      -- items until payment succeeds, so an unpaid attempt is nothing to show.
      AND (channel <> 'online' OR payment_status = 'paid')
    ORDER BY created_at DESC
  `) as any[];
  const orders = rows.map((r) => ({
    ...r,
    items: typeof r.items === "string" ? JSON.parse(r.items) : r.items,
  })) as OrderRecord[];
  await attachItemImages(orders.flatMap((o) => o.items));
  return orders;
}

/**
 * Orders store only name, colour, qty and price per item. For display, look up
 * each item's current photo: the ordered colour's first photo, else the
 * product's first photo, else its legacy image, else a swatch colour. Products
 * deleted since the order simply get no photo.
 */
async function attachItemImages(items: OrderItem[]): Promise<void> {
  const ids = [...new Set(items.map((i) => i.productId).filter(Boolean))];
  if (ids.length === 0) return;
  const rows = (await sql`
    SELECT p.id AS "productId", p.swatch AS "productSwatch", p.image_url AS "legacyImage",
           c.name AS "colourName", c.swatch AS "colourSwatch",
           (SELECT i.image_key FROM product_images i WHERE i.color_id = c.id ORDER BY i.sort ASC LIMIT 1) AS "imageKey"
    FROM products p
    LEFT JOIN product_colors c ON c.product_id = p.id
    WHERE p.id = ANY(${ids})
    ORDER BY p.id, c.sort ASC NULLS LAST, c.name ASC
  `) as { productId: string; productSwatch: string | null; legacyImage: string | null; colourName: string | null; colourSwatch: string | null; imageKey: string | null }[];
  const byProduct = new Map<string, typeof rows>();
  for (const r of rows) byProduct.set(r.productId, [...(byProduct.get(r.productId) ?? []), r]);

  for (const item of items) {
    const colours = byProduct.get(item.productId);
    if (!colours || colours.length === 0) { item.imageUrl = null; item.swatch = null; continue; }
    const wanted = item.colour?.trim().toLowerCase();
    const match = wanted ? colours.find((c) => c.colourName?.trim().toLowerCase() === wanted) : undefined;
    const pick = (match?.imageKey ? match : undefined) ?? colours.find((c) => c.imageKey) ?? match ?? colours[0];
    item.imageUrl = imageUrl(pick.imageKey ?? pick.legacyImage);
    item.swatch = pick.colourSwatch ?? pick.productSwatch ?? null;
  }
}
