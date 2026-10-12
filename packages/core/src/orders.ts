// Confirmed orders (Neon Postgres, table orders).
//
// A row here is a real order: placed over WhatsApp / Instagram, or paid online.
// Online checkout attempts live in payment_attempts (see payment-attempts.ts)
// and become an order only once the payment is confirmed.
//
// Table (run the migration SQL once in Neon):
//   CREATE TABLE orders (
//     id UUID PK, user_id UUID, customer_name, mobile, pincode,
//     address_line1, address_line2, landmark, city, state,
//     items JSONB, total INTEGER, channel TEXT, created_at,
//     -- infra/db/2026-10-11-online-payments.sql:
//     payment_status TEXT, razorpay_order_id TEXT, razorpay_payment_id TEXT, paid_at TIMESTAMPTZ
//   );

import { neon } from "@neondatabase/serverless";
import { imageUrl } from "./s3";

const sql = neon(process.env.DATABASE_URL!);

export type OrderChannel = "whatsapp" | "instagram" | "online";
/** not_required: chat order. paid: online order (unpaid attempts never reach this table). */
export type PaymentStatus = "not_required" | "paid";

export type OrderItem = {
  productId: string;
  name: string;
  colour: string | null;
  /** Chosen size, or null for products without sizes. */
  size?: string | null;
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

/** A WhatsApp / Instagram order. Online orders are written by confirmAttemptPaid. */
export async function createOrder(input: {
  userId: string | null;
  address: OrderAddress;
  items: OrderItem[];
  total: number;
  channel: "whatsapp" | "instagram";
}): Promise<string> {
  const { address, items, total, channel, userId } = input;
  const rows = (await sql`
    INSERT INTO orders (
      user_id, customer_name, mobile, pincode,
      address_line1, address_line2, landmark, city, state,
      items, total, channel, payment_status
    ) VALUES (
      ${userId}, ${address.customerName}, ${address.mobile}, ${address.pincode},
      ${address.addressLine1}, ${address.addressLine2}, ${address.landmark},
      ${address.city}, ${address.state},
      ${JSON.stringify(items)}, ${total}, ${channel}, 'not_required'
    )
    RETURNING id
  `) as any[];
  return rows[0].id as string;
}

// ---------------------------------------------------------------- reading orders

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
