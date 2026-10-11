// Checkout attempts for online payment (Neon Postgres, table payment_attempts,
// see infra/db/2026-10-11-payment-attempts.sql).
//
// An attempt is one "Pay online" click: cart snapshot, address, and the
// Razorpay order created for it. Retries of the same cart reuse the attempt,
// so a shopper can only ever be charged once per intended purchase. A row is
// written to `orders` only when the payment is confirmed, by whichever of the
// browser flow (signature verified) or Razorpay's webhook gets there first.

import { neon } from "@neondatabase/serverless";
import type { OrderAddress, OrderItem } from "./orders";

const sql = neon(process.env.DATABASE_URL!);

export type AttemptStatus = "pending" | "paid" | "failed" | "abandoned";

export type PaymentAttempt = {
  id: string;
  userId: string | null;
  total: number;
  status: AttemptStatus;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  orderId: string | null;
  createdAt: string;
};

const COLUMNS = `id, user_id AS "userId", total, status, razorpay_order_id AS "razorpayOrderId",
                 razorpay_payment_id AS "razorpayPaymentId", order_id AS "orderId", created_at AS "createdAt"`;

export async function createAttempt(input: {
  userId: string;
  address: OrderAddress;
  items: OrderItem[];
  total: number;
}): Promise<string> {
  const { address: a, items, total, userId } = input;
  const rows = (await sql`
    INSERT INTO payment_attempts (
      user_id, customer_name, mobile, pincode, address_line1, address_line2, landmark, city, state, items, total
    ) VALUES (
      ${userId}, ${a.customerName}, ${a.mobile}, ${a.pincode}, ${a.addressLine1}, ${a.addressLine2},
      ${a.landmark}, ${a.city}, ${a.state}, ${JSON.stringify(items)}, ${total}
    )
    RETURNING id
  `) as { id: string }[];
  return rows[0].id;
}

/** The shopper's own attempt, if the id belongs to them. */
export async function findAttempt(userId: string, attemptId: string): Promise<PaymentAttempt | null> {
  const rows = (await sql.query(
    `SELECT ${COLUMNS} FROM payment_attempts WHERE user_id = $1 AND id = $2::uuid`,
    [userId, attemptId]
  )) as PaymentAttempt[];
  return rows[0] ?? null;
}

export async function findAttemptByRazorpayOrderId(razorpayOrderId: string): Promise<PaymentAttempt | null> {
  const rows = (await sql.query(
    `SELECT ${COLUMNS} FROM payment_attempts WHERE razorpay_order_id = $1`,
    [razorpayOrderId]
  )) as PaymentAttempt[];
  return rows[0] ?? null;
}

export async function setAttemptRazorpayOrderId(attemptId: string, razorpayOrderId: string): Promise<void> {
  await sql`UPDATE payment_attempts SET razorpay_order_id = ${razorpayOrderId} WHERE id = ${attemptId} AND razorpay_order_id IS NULL`;
}

/** The cart or address changed: this attempt will never be paid. */
export async function markAttemptAbandoned(attemptId: string): Promise<void> {
  await sql`UPDATE payment_attempts SET status = 'abandoned' WHERE id = ${attemptId} AND status IN ('pending', 'failed')`;
}

/**
 * Pending attempts of this shopper that never got a Razorpay order (the
 * Razorpay call failed) and are older than a minute: nobody can pay them.
 * Called before a new attempt is created; the minute keeps a concurrent
 * in-flight attempt out of the sweep.
 */
export async function abandonUnsentAttempts(userId: string): Promise<void> {
  await sql`
    UPDATE payment_attempts SET status = 'abandoned'
    WHERE user_id = ${userId} AND status = 'pending' AND razorpay_order_id IS NULL
      AND created_at < now() - interval '1 minute'
  `;
}

/** A failed attempt is being retried on the same Razorpay order. */
export async function reopenAttempt(attemptId: string): Promise<void> {
  await sql`UPDATE payment_attempts SET status = 'pending', payment_error = NULL WHERE id = ${attemptId} AND status = 'failed'`;
}

/** Razorpay reported a failed payment. Only recorded while the attempt is unpaid. */
export async function markAttemptFailed(razorpayOrderId: string, reason: string): Promise<void> {
  await sql`
    UPDATE payment_attempts SET status = 'failed', payment_error = ${reason.slice(0, 300)}
    WHERE razorpay_order_id = ${razorpayOrderId} AND status IN ('pending', 'failed')
  `;
}

export type ConfirmResult =
  | { outcome: "paid"; orderId: string; userId: string | null }
  | { outcome: "already_paid"; orderId: string | null; userId: string | null }
  | { outcome: "conflict"; orderId: string | null; userId: string | null; existingPaymentId: string }
  | { outcome: "not_found" };

/**
 * Record a verified payment: write the confirmed order and mark the attempt
 * paid. Safe to call any number of times and from both the browser flow and
 * the webhook at once: the unique index on orders.razorpay_order_id lets
 * exactly one caller insert the order ("paid"), every other caller with the
 * same payment id gets "already_paid", and a different payment id against an
 * attempt that is already paid is a "conflict" (never overwritten).
 */
export async function confirmAttemptPaid(razorpayOrderId: string, paymentId: string): Promise<ConfirmResult> {
  const attempt = await findAttemptByRazorpayOrderId(razorpayOrderId);
  if (!attempt) return { outcome: "not_found" };

  if (attempt.status === "paid" && attempt.razorpayPaymentId && attempt.razorpayPaymentId !== paymentId) {
    return { outcome: "conflict", orderId: attempt.orderId, userId: attempt.userId, existingPaymentId: attempt.razorpayPaymentId };
  }

  // The confirmed order, copied from the attempt. ON CONFLICT makes this a
  // no-op when another caller already inserted it.
  const inserted = (await sql`
    INSERT INTO orders (
      user_id, customer_name, mobile, pincode, address_line1, address_line2, landmark, city, state,
      items, total, channel, payment_status, razorpay_order_id, razorpay_payment_id, paid_at
    )
    SELECT user_id, customer_name, mobile, pincode, address_line1, address_line2, landmark, city, state,
           items, total, 'online', 'paid', razorpay_order_id, ${paymentId}, now()
    FROM payment_attempts WHERE id = ${attempt.id}
    ON CONFLICT (razorpay_order_id) WHERE razorpay_order_id IS NOT NULL DO NOTHING
    RETURNING id, user_id AS "userId"
  `) as { id: string; userId: string | null }[];

  const orderRows = inserted.length
    ? inserted
    : ((await sql`SELECT id, user_id AS "userId" FROM orders WHERE razorpay_order_id = ${razorpayOrderId}`) as { id: string; userId: string | null }[]);
  const order = orderRows[0] ?? null;

  await sql`
    UPDATE payment_attempts
    SET status = 'paid', razorpay_payment_id = ${paymentId}, paid_at = COALESCE(paid_at, now()),
        payment_error = NULL, order_id = COALESCE(order_id, ${order?.id ?? null}::uuid)
    WHERE id = ${attempt.id}
  `;

  if (inserted.length) return { outcome: "paid", orderId: inserted[0].id, userId: inserted[0].userId };
  return { outcome: "already_paid", orderId: order?.id ?? null, userId: order?.userId ?? attempt.userId };
}
