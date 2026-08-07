// Order persistence (Neon Postgres).
//
// Table (run the migration SQL once in Neon):
//   CREATE TABLE orders (
//     id UUID PK, user_id UUID, customer_name, mobile, pincode,
//     address_line1, address_line2, landmark, city, state,
//     items JSONB, total INTEGER, channel TEXT, created_at
//   );

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export type OrderItem = {
  productId: string;
  name: string;
  colour: string | null;
  qty: number;
  price: number;
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
      items, total, channel
    ) VALUES (
      ${userId}, ${address.customerName}, ${address.mobile}, ${address.pincode},
      ${address.addressLine1}, ${address.addressLine2}, ${address.landmark},
      ${address.city}, ${address.state},
      ${JSON.stringify(items)}, ${total}, ${channel}
    )
    RETURNING id
  `) as any[];
  return rows[0].id as string;
}
