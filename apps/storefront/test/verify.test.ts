// Route tests for POST /api/payments/verify: signature, ownership and amount
// checks, and the exactly-once owner notification.
import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "token" }) }) }));
vi.mock("@vaishnora/core/auth", () => ({ COOKIE_NAME: "vaishnora_session", verifyToken: vi.fn() }));
vi.mock("@vaishnora/core/payment-attempts", () => ({ confirmAttemptPaid: vi.fn(), findAttemptByRazorpayOrderId: vi.fn() }));
vi.mock("@vaishnora/core/order-notify", () => ({ notifyOrderPaid: vi.fn(async () => {}) }));
vi.mock("@vaishnora/core/payments", async (importOriginal) => {
  const real = await importOriginal<typeof import("@vaishnora/core/payments")>();
  return { ...real, fetchRazorpayPayment: vi.fn() };
});

import { verifyToken } from "@vaishnora/core/auth";
import { confirmAttemptPaid, findAttemptByRazorpayOrderId } from "@vaishnora/core/payment-attempts";
import { notifyOrderPaid } from "@vaishnora/core/order-notify";
import { fetchRazorpayPayment } from "@vaishnora/core/payments";
import { POST } from "../app/api/payments/verify/route";

const USER = "22222222-2222-4222-8222-222222222222";
const ORDER = "order_ABC";
const PAY = "pay_XYZ";
const sign = (o: string, p: string) => createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!).update(`${o}|${p}`).digest("hex");
const attempt = { id: "a1", userId: USER, total: 579, status: "pending" as const, razorpayOrderId: ORDER, razorpayPaymentId: null, orderId: null, createdAt: new Date().toISOString() };

const post = (body: unknown) => POST(new Request("http://test/api/payments/verify", { method: "POST", body: JSON.stringify(body) }));
const json = async (r: Response) => ({ status: r.status, body: await r.json() });
const good = () => ({ razorpay_order_id: ORDER, razorpay_payment_id: PAY, razorpay_signature: sign(ORDER, PAY) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(verifyToken).mockResolvedValue({ sub: USER, name: "Siva", exp: Date.now() + 1e6 });
  vi.mocked(findAttemptByRazorpayOrderId).mockResolvedValue(attempt);
  vi.mocked(fetchRazorpayPayment).mockResolvedValue({ id: PAY, orderId: ORDER, amount: 57900, status: "captured", method: "upi" });
  vi.mocked(confirmAttemptPaid).mockResolvedValue({ outcome: "paid", orderId: "o1", userId: USER });
});

describe("verify", () => {
  test("rejects a signed-out caller", async () => {
    vi.mocked(verifyToken).mockResolvedValue(null);
    expect((await json(await post(good()))).status).toBe(401);
  });

  test("rejects missing fields", async () => {
    const r = await json(await post({ razorpay_order_id: ORDER }));
    expect(r.status).toBe(400);
    expect(confirmAttemptPaid).not.toHaveBeenCalled();
  });

  test("rejects a forged signature and records nothing", async () => {
    const r = await json(await post({ ...good(), razorpay_signature: sign(ORDER, "pay_OTHER") }));
    expect(r.status).toBe(400);
    expect(r.body.error).toContain("could not be verified");
    expect(confirmAttemptPaid).not.toHaveBeenCalled();
    expect(notifyOrderPaid).not.toHaveBeenCalled();
  });

  test("rejects a valid signature for an order that belongs to someone else", async () => {
    vi.mocked(findAttemptByRazorpayOrderId).mockResolvedValue({ ...attempt, userId: "99999999-9999-4999-8999-999999999999" });
    const r = await json(await post(good()));
    expect(r.status).toBe(404);
    expect(confirmAttemptPaid).not.toHaveBeenCalled();
  });

  test("rejects when Razorpay reports a different amount or order", async () => {
    vi.mocked(fetchRazorpayPayment).mockResolvedValueOnce({ id: PAY, orderId: ORDER, amount: 100, status: "captured", method: "upi" });
    const r = await json(await post(good()));
    expect(r.status).toBe(400);
    expect(r.body.error).toContain("do not match");
    expect(confirmAttemptPaid).not.toHaveBeenCalled();
  });

  test("confirms the payment and notifies the owners exactly once", async () => {
    const r = await json(await post(good()));
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ok: true, orderId: "o1" });
    expect(confirmAttemptPaid).toHaveBeenCalledWith(ORDER, PAY);
    expect(notifyOrderPaid).toHaveBeenCalledTimes(1);
    expect(notifyOrderPaid).toHaveBeenCalledWith("o1");
  });

  test("a repeat of the same confirmation is ok but sends no second email", async () => {
    vi.mocked(confirmAttemptPaid).mockResolvedValueOnce({ outcome: "already_paid", orderId: "o1", userId: USER });
    const r = await json(await post(good()));
    expect(r.status).toBe(200);
    expect(r.body.orderId).toBe("o1");
    expect(notifyOrderPaid).not.toHaveBeenCalled();
  });

  test("a second payment against a paid attempt is refused as a conflict", async () => {
    vi.mocked(confirmAttemptPaid).mockResolvedValueOnce({ outcome: "conflict", orderId: "o1", userId: USER, existingPaymentId: "pay_FIRST" });
    const r = await json(await post(good()));
    expect(r.status).toBe(409);
    expect(notifyOrderPaid).not.toHaveBeenCalled();
  });

  test("still confirms when Razorpay cannot be reached, because the signature already proves the payment", async () => {
    vi.mocked(fetchRazorpayPayment).mockRejectedValueOnce(new Error("network"));
    const r = await json(await post(good()));
    expect(r.status).toBe(200);
    expect(confirmAttemptPaid).toHaveBeenCalled();
  });
});
