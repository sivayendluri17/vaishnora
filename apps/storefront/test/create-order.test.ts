// Route tests for POST /api/payments/create-order with the data layer and
// Razorpay mocked: they check the money logic (server-side pricing, size and
// stock rules, attempt reuse, Razorpay failure handling) without a database.
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "token" }) }) }));
vi.mock("@vaishnora/core/auth", () => ({ COOKIE_NAME: "vaishnora_session", verifyToken: vi.fn() }));
vi.mock("@vaishnora/core/products-db", () => ({ getActiveProduct: vi.fn() }));
vi.mock("@vaishnora/core/payment-attempts", () => ({
  abandonUnsentAttempts: vi.fn(async () => {}),
  createAttempt: vi.fn(async () => "11111111-1111-4111-8111-111111111111"),
  findAttempt: vi.fn(async () => null),
  markAttemptAbandoned: vi.fn(async () => {}),
  reopenAttempt: vi.fn(async () => {}),
  setAttemptRazorpayOrderId: vi.fn(async () => {}),
}));
vi.mock("@vaishnora/core/payments", () => ({
  RAZORPAY_KEY_ID: "rzp_test_unit",
  razorpayConfigured: () => true,
  createRazorpayOrder: vi.fn(async ({ amountPaise }: { amountPaise: number }) => ({ id: "order_new", amount: amountPaise, currency: "INR", status: "created" })),
  fetchRazorpayOrder: vi.fn(async (id: string) => ({ id, amount: 62900, currency: "INR", status: "created" })),
  findRazorpayOrderByReceipt: vi.fn(async () => null),
}));

import { verifyToken } from "@vaishnora/core/auth";
import { getActiveProduct } from "@vaishnora/core/products-db";
import * as attempts from "@vaishnora/core/payment-attempts";
import * as rzp from "@vaishnora/core/payments";
import { POST } from "../app/api/payments/create-order/route";

const USER = "22222222-2222-4222-8222-222222222222";
const SAREE = "33333333-3333-4333-8333-333333333333";
const KURTI = "44444444-4444-4444-8444-444444444444";
const products: Record<string, any> = {
  [SAREE]: { id: SAREE, name: "Teal Saree", price: 599, salePrice: 549, inStock: true, sizes: [], colors: [{ name: "Teal" }, { name: "Red" }] },
  [KURTI]: { id: KURTI, name: "Paisley Kurti", price: 549, salePrice: null, inStock: true, sizes: ["M", "L"], colors: [{ name: "Mustard" }] },
};
const address = { customerName: "Siva", mobile: "7799020081", pincode: "522660", addressLine1: "15-104", addressLine2: "Colony", landmark: "", city: "Nuzendla", state: "Andhra Pradesh" };

const post = (body: unknown) => POST(new Request("http://test/api/payments/create-order", { method: "POST", body: JSON.stringify(body) }));
const json = async (r: Response) => ({ status: r.status, body: await r.json() });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(verifyToken).mockResolvedValue({ sub: USER, name: "Siva", exp: Date.now() + 1e6 });
  vi.mocked(getActiveProduct).mockImplementation(async (id: string) => products[id] ?? null);
});

describe("create-order", () => {
  test("rejects a signed-out shopper", async () => {
    vi.mocked(verifyToken).mockResolvedValue(null);
    const r = await json(await post({ address, items: [{ productId: SAREE, qty: 1 }] }));
    expect(r.status).toBe(401);
  });

  test.each([
    ["empty cart", { address, items: [] }, 400, "cart is empty"],
    ["bad address", { address: { customerName: "x" }, items: [{ productId: SAREE, qty: 1 }] }, 400, "required address"],
    ["quantity too high", { address, items: [{ productId: SAREE, qty: 11 }] }, 400, "between 1 and 10"],
    ["unknown product", { address, items: [{ productId: "55555555-5555-4555-8555-555555555555", qty: 1 }] }, 400, "no longer available"],
    ["sized product without size", { address, items: [{ productId: KURTI, qty: 1 }] }, 400, "choose a size"],
    ["sized product with a size it does not offer", { address, items: [{ productId: KURTI, qty: 1, size: "XL" }] }, 400, "choose a size"],
  ])("rejects %s", async (_label, body, status, message) => {
    const r = await json(await post(body));
    expect(r.status).toBe(status);
    expect(r.body.error).toContain(message);
    expect(attempts.createAttempt).not.toHaveBeenCalled();
    expect(rzp.createRazorpayOrder).not.toHaveBeenCalled();
  });

  test("rejects an out-of-stock product", async () => {
    vi.mocked(getActiveProduct).mockResolvedValueOnce({ ...products[SAREE], inStock: false });
    const r = await json(await post({ address, items: [{ productId: SAREE, qty: 1 }] }));
    expect(r.status).toBe(400);
    expect(r.body.error).toContain("out of stock");
  });

  test("prices the cart on the server: sale price, delivery, and ignores any client amount", async () => {
    const r = await json(await post({ address, total: 1, amount: 1, items: [{ productId: SAREE, qty: 2, colour: "Red" }, { productId: KURTI, qty: 1, size: "L" }] }));
    expect(r.status).toBe(200);
    // 2 x 549 (sale price) + 549 + 80 delivery = 1727 rupees
    expect(rzp.createRazorpayOrder).toHaveBeenCalledWith(expect.objectContaining({ amountPaise: 172700, receipt: "11111111-1111-4111-8111-111111111111" }));
    const saved = vi.mocked(attempts.createAttempt).mock.calls[0][0];
    expect(saved.total).toBe(1727);
    expect(saved.items).toEqual([
      expect.objectContaining({ productId: SAREE, colour: "Red", size: null, qty: 2, price: 549 }),
      expect.objectContaining({ productId: KURTI, colour: "Mustard", size: "L", qty: 1, price: 549 }),
    ]);
    expect(r.body).toMatchObject({ attemptId: "11111111-1111-4111-8111-111111111111", razorpayOrderId: "order_new", amount: 172700, keyId: "rzp_test_unit" });
    expect(r.body).not.toHaveProperty("keySecret");
  });

  test("falls back to the first colour when the requested colour no longer exists", async () => {
    await post({ address, items: [{ productId: SAREE, qty: 1, colour: "Purple" }] });
    expect(vi.mocked(attempts.createAttempt).mock.calls[0][0].items[0].colour).toBe("Teal");
  });

  test("the same product in two sizes is two lines, the same line twice is rejected", async () => {
    const ok = await json(await post({ address, items: [{ productId: KURTI, qty: 1, size: "M" }, { productId: KURTI, qty: 1, size: "L" }] }));
    expect(ok.status).toBe(200);
    const dup = await json(await post({ address, items: [{ productId: KURTI, qty: 1, size: "M" }, { productId: KURTI, qty: 1, size: "M" }] }));
    expect(dup.status).toBe(400);
  });

  test("reuses a pending attempt with the same total instead of creating another Razorpay order", async () => {
    vi.mocked(attempts.findAttempt).mockResolvedValueOnce({ id: "a1", userId: USER, total: 629, status: "pending", razorpayOrderId: "order_old", razorpayPaymentId: null, orderId: null, createdAt: new Date().toISOString() });
    const r = await json(await post({ attemptId: "66666666-6666-4666-8666-666666666666", address, items: [{ productId: SAREE, qty: 1 }] }));
    expect(r.status).toBe(200);
    expect(r.body.razorpayOrderId).toBe("order_old");
    expect(rzp.createRazorpayOrder).not.toHaveBeenCalled();
    expect(attempts.createAttempt).not.toHaveBeenCalled();
  });

  test("a changed cart abandons the old attempt and starts a new one", async () => {
    vi.mocked(attempts.findAttempt).mockResolvedValueOnce({ id: "a1", userId: USER, total: 999, status: "pending", razorpayOrderId: "order_old", razorpayPaymentId: null, orderId: null, createdAt: new Date().toISOString() });
    const r = await json(await post({ attemptId: "66666666-6666-4666-8666-666666666666", address, items: [{ productId: SAREE, qty: 1 }] }));
    expect(r.status).toBe(200);
    expect(attempts.markAttemptAbandoned).toHaveBeenCalledWith("a1");
    expect(attempts.createAttempt).toHaveBeenCalled();
    expect(r.body.razorpayOrderId).toBe("order_new");
  });

  test("an attempt that is already paid answers 409 so the popup never reopens", async () => {
    vi.mocked(attempts.findAttempt).mockResolvedValueOnce({ id: "a1", userId: USER, total: 629, status: "paid", razorpayOrderId: "order_old", razorpayPaymentId: "pay_1", orderId: "o1", createdAt: new Date().toISOString() });
    const r = await json(await post({ attemptId: "66666666-6666-4666-8666-666666666666", address, items: [{ productId: SAREE, qty: 1 }] }));
    expect(r.status).toBe(409);
    expect(r.body).toMatchObject({ alreadyPaid: true, orderId: "o1" });
  });

  test("when Razorpay is unreachable the shopper gets a retryable error that keeps the attempt", async () => {
    vi.mocked(rzp.createRazorpayOrder).mockRejectedValueOnce(new Error("timeout"));
    const r = await json(await post({ address, items: [{ productId: SAREE, qty: 1 }] }));
    expect(r.status).toBe(502);
    expect(r.body.attemptId).toBe("11111111-1111-4111-8111-111111111111");
    expect(r.body.error).toContain("try again");
  });
});
