-- Per-colour descriptions.
-- Run once against the production database (Neon SQL editor, or psql).
-- Safe to run more than once. Adds a column only: no existing data is changed,
-- and every existing colour starts with an empty description, which means
-- "show the product's general description".
--
-- Undo: ALTER TABLE product_colors DROP COLUMN description;

ALTER TABLE product_colors
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
