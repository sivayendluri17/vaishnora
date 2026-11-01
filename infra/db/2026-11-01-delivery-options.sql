-- Delivery options: Regular (₹80, within 8 days) and Priority (₹150, within 3 days).
-- Run once against the production database (Neon SQL editor) BEFORE merging the
-- code that uses it. Safe to run more than once: adds columns only.
--
-- orders.delivery_option   'regular' | 'priority'   (what the shopper chose)
-- orders.delivery_fee      rupees charged for delivery, part of total
-- orders.promised_by       the date we told the shopper it reaches them
--
-- The same three columns on payment_attempts, so a paid attempt copies them
-- into the order exactly as they were when the shopper paid.
--
-- Existing rows get 'regular' / 80 / NULL: they were all charged ₹80 and were
-- never given a date, so the shop shows them as "Regular delivery" only.
--
-- Undo:
--   ALTER TABLE orders DROP COLUMN delivery_option, DROP COLUMN delivery_fee, DROP COLUMN promised_by;
--   ALTER TABLE payment_attempts DROP COLUMN delivery_option, DROP COLUMN delivery_fee, DROP COLUMN promised_by;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_option TEXT    NOT NULL DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS delivery_fee    INTEGER NOT NULL DEFAULT 80,
  ADD COLUMN IF NOT EXISTS promised_by     DATE;

ALTER TABLE payment_attempts
  ADD COLUMN IF NOT EXISTS delivery_option TEXT    NOT NULL DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS delivery_fee    INTEGER NOT NULL DEFAULT 80,
  ADD COLUMN IF NOT EXISTS promised_by     DATE;
