-- Product measurements (height, width, weight) for accessories.
-- Run once against the production database (Neon SQL editor, or psql).
-- Safe to run more than once. Adds one column: no existing data is changed,
-- and every existing product starts with no measurements.
--
-- specs is a small JSON object keyed by measurement, e.g.
--   {"heightIn": 4.5, "widthIn": 6, "weightG": 120}
-- Which measurements a type offers is defined in packages/core/src/catalog.ts.
--
-- Run this BEFORE deploying the code that saves measurements: the storefront
-- reads the column defensively, but the admin cannot save into a column that
-- does not exist yet.
--
-- Undo: ALTER TABLE products DROP COLUMN specs;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS specs JSONB NOT NULL DEFAULT '{}'::jsonb;
