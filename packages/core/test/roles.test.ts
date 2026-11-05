import { describe, expect, test } from "vitest";
import { canManageProduct, canSeeOperations, isAdminRole, parseRole, vendorIdsIn, vendorOrderView } from "../src/roles";
import type { OrderDetail } from "../src/orders";

const VENDOR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const order: OrderDetail = {
  id: "58bb81e6-1e74-4dd2-816c-15bdf8351613",
  customerName: "Chandana Boddu", mobile: "8639630935", pincode: "530024",
  addressLine1: "15-104, Simhagiri colony", addressLine2: "", landmark: "Near temple", city: "Visakhapatnam", state: "Andhra Pradesh",
  items: [
    { productId: "p1", name: "Mustard Kurti", colour: "Mustard", size: "M", qty: 2, price: 549, asin: "VSH0062", imageUrl: "https://images.example/k.jpg", swatch: "#cc9", vendorId: VENDOR },
    { productId: "p2", name: "Golden deya", colour: null, qty: 1, price: 50, asin: "VSH0070", vendorId: OTHER },
    { productId: "p3", name: "House saree", colour: "Black", qty: 1, price: 999, asin: "VSH0001", vendorId: null },
  ],
  total: 2147, channel: "online", paymentStatus: "paid", paidAt: "2026-11-05T10:28:50.000Z", createdAt: "2026-11-05T10:26:32.000Z",
  razorpayOrderId: "order_X", razorpayPaymentId: "pay_Y",
  deliveryOption: "priority", deliveryFee: 150, promisedBy: "2026-11-08",
};

describe("roles", () => {
  test("parse and admin check", () => {
    expect(parseRole("owner")).toBe("owner");
    expect(parseRole("vendor")).toBe("vendor");
    expect(parseRole("admin")).toBe("customer");
    expect(parseRole(undefined)).toBe("customer");
    expect(isAdminRole("vendor")).toBe(true);
    expect(isAdminRole("customer")).toBe(false);
  });

  test("only owners see operations", () => {
    expect(canSeeOperations("owner")).toBe(true);
    expect(canSeeOperations("vendor")).toBe(false);
    expect(canSeeOperations(null)).toBe(false);
  });

  test("vendors manage only their own products, owners anything", () => {
    expect(canManageProduct({ id: VENDOR, role: "vendor" }, VENDOR)).toBe(true);
    expect(canManageProduct({ id: VENDOR, role: "vendor" }, OTHER)).toBe(false);
    expect(canManageProduct({ id: VENDOR, role: "vendor" }, null)).toBe(false);
    expect(canManageProduct({ id: OTHER, role: "owner" }, VENDOR)).toBe(true);
    expect(canManageProduct({ id: OTHER, role: "owner" }, null)).toBe(true);
  });
});

describe("vendorOrderView", () => {
  test("keeps only the vendor's lines and nothing about the customer", () => {
    const v = vendorOrderView(order, VENDOR)!;
    expect(v.ref).toBe("58BB81E6");
    expect(v.items.map((i) => i.name)).toEqual(["Mustard Kurti"]);
    expect(v.deliveryOption).toBe("priority");
    expect(v.promisedBy).toBe("2026-11-08");
    const text = JSON.stringify(v);
    for (const secret of ["Chandana", "8639630935", "530024", "Simhagiri", "Visakhapatnam", "temple", "pay_Y", "order_X", "2147"]) {
      expect(text).not.toContain(secret);
    }
    expect(Object.keys(v).sort()).toEqual(["channel", "createdAt", "deliveryOption", "id", "items", "paidAt", "paymentStatus", "promisedBy", "ref"]);
  });

  test("null when the vendor has no line in the order", () => {
    expect(vendorOrderView(order, "cccccccc-cccc-4ccc-8ccc-cccccccccccc")).toBeNull();
  });

  test("vendorIdsIn lists each vendor once and skips house products", () => {
    expect(vendorIdsIn(order).sort()).toEqual([VENDOR, OTHER].sort());
  });
});
