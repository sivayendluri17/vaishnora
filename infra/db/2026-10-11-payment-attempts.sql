-- Payment attempts live in their own table; orders holds confirmed orders only.
-- Run once against the production database (Neon SQL editor, or psql).
-- Safe to run more than once. Adds a table and indexes only.
--
-- One row per checkout attempt (the "Pay online" click). It carries the cart
-- snapshot, the address and the Razorpay order so retries reuse it, and a row
-- is written to orders only when the payment is confirmed (signature verified
-- in the browser flow, or Razorpay's webhook). Unpaid attempts never become
-- orders.
--
-- status: pending | paid | failed | abandoned
-- order_id: the confirmed order this attempt produced (NULL until paid)
--
-- The payment_attempt_id and payment_error columns on orders are no longer
-- written by the application. They can be dropped once the new code is live:
--   DROP INDEX IF EXISTS orders_payment_attempt_id_key;
--   ALTER TABLE orders DROP COLUMN IF EXISTS payment_attempt_id, DROP COLUMN IF EXISTS payment_error;
--
-- Undo: DROP TABLE payment_attempts;

CREATE TABLE IF NOT EXISTS payment_attempts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_name       TEXT NOT NULL,
  mobile              TEXT NOT NULL,
  pincode             TEXT NOT NULL,
  address_line1       TEXT NOT NULL,
  address_line2       TEXT NOT NULL DEFAULT '',
  landmark            TEXT NOT NULL DEFAULT '',
  city                TEXT NOT NULL,
  state               TEXT NOT NULL,
  items               JSONB NOT NULL,
  total               INTEGER NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending',
  razorpay_order_id   TEXT,
  razorpay_payment_id TEXT,
  payment_error       TEXT,
  order_id            UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at             TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_attempts_razorpay_order_id_key
  ON payment_attempts (razorpay_order_id) WHERE razorpay_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payment_attempts_razorpay_payment_id_key
  ON payment_attempts (razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payment_attempts_user_status_idx
  ON payment_attempts (user_id, status);
