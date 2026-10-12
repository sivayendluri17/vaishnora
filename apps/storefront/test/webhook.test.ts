// Route tests for POST /api/payments/webhook: raw-body signature check,
// event handling, and the exactly-once owner notification.
import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@vaishnora/core/payment-attempts", () => ({ confirmAttemptPaid: vi.fn(), markAttemptFailed: vi.fn(async () => {}) }));
vi.mock("@vaishnora/core/order-notify", () => ({ notifyOrderPaid: vi.fn(async () => {}) }));

import { confirmAttemptPaid, markAttemptFailed } from "@vaishnora/core/payment-attempts";
import { notifyOrderPaid } from "@vaishnora/core/order-notify";
import { POST } from "../app/api/payments/webhook/route";

const secret = () => process.env.RAZORPAY_WEBHOOK_SECRET!;
const send = (body: string, signature: string | null) =>
  POST(new Request("http://test/api/payments/webhook", { method: "POST", headers: signature ? { "x-razorpay-signature": signature } : {}, body }));
const signed = (payload: unknown) => { const raw = JSON.stringify(payload); return send(raw, createHmac("sha256", secret()).update(raw).digest("hex")); };
const json = async (r: Response) => ({ status: r.status, body: await r.json() });
const captured = { event: "payment.captured", payload: { payment: { entity: { id: "pay_1", order_id: "order_1", status: "captured" } } } };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(confirmAttemptPaid).mockResolvedValue({ outcome: "paid", orderId: "o1", userId: "u1" });
});

describe("webhook", () => {
  test("rejects a missing or wrong signature without touching the database", async () => {
    expect((await json(await send(JSON.stringify(captured), null))).status).toBe(400);
    expect((await json(await send(JSON.stringify(captured), "deadbeef"))).status).toBe(400);
    expect(confirmAttemptPaid).not.toHaveBeenCalled();
  });

  test("rejects a body altered after signing", async () => {
    const raw = JSON.stringify(captured);
    const sig = createHmac("sha256", secret()).update(raw).digest("hex");
    const r = await json(await send(raw.replace("pay_1", "pay_2"), sig));
    expect(r.status).toBe(400);
  });

  test("payment.captured confirms the attempt and notifies the owners once", async () => {
    const r = await json(await signed(captured));
    expect(r.status).toBe(200);
    expect(r.body.outcome).toBe("paid");
    expect(confirmAttemptPaid).toHaveBeenCalledWith("order_1", "pay_1");
    expect(notifyOrderPaid).toHaveBeenCalledTimes(1);
  });

  test("order.paid is handled the same way", async () => {
    const r = await json(await signed({ event: "order.paid", payload: { order: { entity: { id: "order_1" } }, payment: { entity: { id: "pay_1" } } } }));
    expect(r.status).toBe(200);
    expect(confirmAttemptPaid).toHaveBeenCalledWith("order_1", "pay_1");
  });

  test("a redelivered event answers 200 with already_paid and sends no second email", async () => {
    vi.mocked(confirmAttemptPaid).mockResolvedValueOnce({ outcome: "already_paid", orderId: "o1", userId: "u1" });
    const r = await json(await signed(captured));
    expect(r.status).toBe(200);
    expect(r.body.outcome).toBe("already_paid");
    expect(notifyOrderPaid).not.toHaveBeenCalled();
  });

  test("payment.failed records the reason on the attempt", async () => {
    const r = await json(await signed({ event: "payment.failed", payload: { payment: { entity: { id: "pay_1", order_id: "order_1", error_description: "Card declined" } } } }));
    expect(r.status).toBe(200);
    expect(markAttemptFailed).toHaveBeenCalledWith("order_1", "Card declined");
    expect(confirmAttemptPaid).not.toHaveBeenCalled();
  });

  test("events we do not care about are acknowledged and ignored", async () => {
    const r = await json(await signed({ event: "refund.created", payload: {} }));
    expect(r.status).toBe(200);
    expect(r.body.ignored).toBe("refund.created");
    expect(confirmAttemptPaid).not.toHaveBeenCalled();
  });

  test("an event for an unknown order is acknowledged so Razorpay stops retrying", async () => {
    vi.mocked(confirmAttemptPaid).mockResolvedValueOnce({ outcome: "not_found" });
    const r = await json(await signed(captured));
    expect(r.status).toBe(200);
    expect(notifyOrderPaid).not.toHaveBeenCalled();
  });
});
