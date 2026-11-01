// Pricing rules shared by the browser (cart, checkout summary) and the server
// (online payment amount). No server-only imports here: this file is bundled
// into client components.

import type { Product } from "./products";
import { DELIVERY } from "./delivery";

/** The Regular delivery charge in rupees. Delivery options live in ./delivery. */
export const DELIVERY_FEE_INR = DELIVERY.regular.fee;

/** Razorpay refuses orders below 1 rupee. */
export const MIN_ONLINE_PAYMENT_PAISE = 100;

/** Highest quantity of one product in a single order. */
export const MAX_QTY_PER_ITEM = 10;

/** Price actually charged for one unit: the sale price when it is a real discount. */
export function unitPrice(p: Pick<Product, "price" | "salePrice">): number {
  return p.salePrice != null && p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : p.price;
}

/** Rupees to paise (Razorpay's unit). Prices are whole rupees, so this is exact. */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}
