-- Roles and vendor isolation.
-- Run once against the production database (Neon SQL editor) BEFORE merging the
-- code that uses it. Safe to run more than once: adds columns and backfills.
--
-- users.role        'customer' | 'vendor' | 'owner'
--                   owner  = full admin: catalog, every order with customer details, metrics, alarms, people
--                   vendor = admin for their own products only; orders show only their lines, never the customer
--                   customer = shop account, no admin access
-- products.vendor_id  the vendor who added the product (NULL = Vaishnora's own stock, managed by owners)
--
-- Existing admins (is_admin = true) become owners. is_admin stays for now and is
-- no longer read by the code; drop it once this has been live for a while:
--   ALTER TABLE users DROP COLUMN is_admin;
--
-- Undo:
--   ALTER TABLE products DROP COLUMN vendor_id;
--   ALTER TABLE users DROP COLUMN role;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer';

UPDATE users SET role = 'owner' WHERE is_admin = true AND role = 'customer';

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS products_vendor_id_idx ON products (vendor_id);
