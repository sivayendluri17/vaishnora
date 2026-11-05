// Who may do what in the admin. Pure: no database, safe in client components.
//
//   owner   Siva and Vaishnora Couture: everything, including customer details,
//           metrics, alarms and granting access to others.
//   vendor  A seller who lists their own products: catalog limited to those
//           products, orders limited to their own lines with NO customer
//           information. Vaishnora ships, so the vendor only needs to know
//           what to pack and by when.
//   customer  A shop account. No admin access.

import type { OrderDetail, OrderItem } from "./orders";
import type { DeliveryOption } from "./delivery";

export type Role = "customer" | "vendor" | "owner";
export type AdminRole = Exclude<Role, "customer">;

export const ROLES: Role[] = ["customer", "vendor", "owner"];

export function parseRole(v: unknown): Role {
  return v === "owner" || v === "vendor" ? v : "customer";
}

export function isAdminRole(role: Role | null | undefined): role is AdminRole {
  return role === "owner" || role === "vendor";
}

/** Metrics, alarms, the full order list with customer details, and the People page. */
export function canSeeOperations(role: Role | null | undefined): boolean {
  return role === "owner";
}

/** True when this admin may change this product (owners: any; vendors: their own). */
export function canManageProduct(user: { id: string; role: Role }, productVendorId: string | null | undefined): boolean {
  if (user.role === "owner") return true;
  return user.role === "vendor" && !!productVendorId && productVendorId === user.id;
}

/** What a vendor is allowed to see of an order: their lines, the timing, nothing about the customer. */
export type VendorOrderLine = Pick<OrderItem, "productId" | "name" | "colour" | "size" | "qty" | "price" | "imageUrl" | "swatch" | "asin">;
export type VendorOrder = {
  id: string;
  /** Short reference shown to everyone: first 8 characters of the id, upper case. */
  ref: string;
  createdAt: string;
  paidAt: string | null;
  channel: string;
  paymentStatus: string;
  deliveryOption: DeliveryOption;
  promisedBy: string | null;
  items: VendorOrderLine[];
};

const LINE_KEYS: (keyof VendorOrderLine)[] = ["productId", "name", "colour", "size", "qty", "price", "imageUrl", "swatch", "asin"];

/**
 * Reduce a full order to what one vendor may see. Returns null when none of
 * the lines belong to that vendor. Builds a fresh object from an allow-list,
 * so a new column on orders can never leak to vendors by accident.
 */
export function vendorOrderView(order: OrderDetail, vendorId: string): VendorOrder | null {
  const mine = order.items.filter((i) => i.vendorId === vendorId);
  if (mine.length === 0) return null;
  const items = mine.map((i) => {
    const line = {} as VendorOrderLine;
    for (const k of LINE_KEYS) (line as Record<string, unknown>)[k] = i[k] ?? null;
    return line;
  });
  return {
    id: order.id,
    ref: order.id.slice(0, 8).toUpperCase(),
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    channel: order.channel,
    paymentStatus: order.paymentStatus,
    deliveryOption: order.deliveryOption,
    promisedBy: order.promisedBy,
    items,
  };
}

/** Every vendor id that has at least one line in the order. */
export function vendorIdsIn(order: Pick<OrderDetail, "items">): string[] {
  return [...new Set(order.items.map((i) => i.vendorId).filter((v): v is string => !!v))];
}
