-- Online payments (Razorpay).
-- Run once against the production database (Neon SQL editor, or psql).
-- Safe to run more than once. Adds columns and indexes only: existing orders
-- are untouched and keep payment_status = 'not_required' (WhatsApp / Instagram).
--
-- payment_status values:
--   not_required  order placed over WhatsApp / Instagram (no online payment)
--   pending       Razorpay order created, shopper has not paid yet
--   paid          signature verified (browser) or webhook confirmed
--   failed        Razorpay reported the attempt failed (shopper may retry)
--   abandoned     replaced by a newer attempt (cart or address changed)
--
-- payment_attempt_id: one per checkout attempt. Retries of the same cart reuse
--   the row (and its Razorpay order), so a shopper can never be charged twice
--   for one intended purchase.
-- razorpay_order_id / razorpay_payment_id: unique, so a payment can only ever
--   be recorded against one order.
--
-- Undo:
--   DROP INDEX IF EXISTS orders_payment_attempt_id_key, orders_razorpay_order_id_key, orders_razorpay_payment_id_key;
--   ALTER TABLE orders DROP COLUMN payment_status, DROP COLUMN payment_attempt_id,
--     DROP COLUMN razorpay_order_id, DROP COLUMN razorpay_payment_id,
--     DROP COLUMN payment_error, DROP COLUMN paid_at;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_status      TEXT NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS payment_attempt_id  UUID,
  ADD COLUMN IF NOT EXISTS razorpay_order_id   TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_error       TEXT,
  ADD COLUMN IF NOT EXISTS paid_at             TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_attempt_id_key
  ON orders (payment_attempt_id) WHERE payment_attempt_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_razorpay_order_id_key
  ON orders (razorpay_order_id) WHERE razorpay_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_razorpay_payment_id_key
  ON orders (razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;
