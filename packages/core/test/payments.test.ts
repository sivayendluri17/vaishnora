import { createHmac } from "node:crypto";
import { describe, expect, test } from "vitest";
import { razorpayConfigured, verifyPaymentSignature, verifyWebhookSignature, webhookConfigured } from "../src/payments";

// Keys come from vitest.setup.ts placeholders.
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!;
const hmac = (secret: string, data: string) => createHmac("sha256", secret).update(data).digest("hex");

describe("configuration", () => {
  test("keys from the environment are seen as configured", () => {
    expect(razorpayConfigured()).toBe(true);
    expect(webhookConfigured()).toBe(true);
  });
});

describe("verifyPaymentSignature", () => {
  const orderId = "order_ABC123";
  const paymentId = "pay_XYZ789";
  const valid = hmac(KEY_SECRET, `${orderId}|${paymentId}`);

  test("accepts the signature Razorpay would produce", () => {
    expect(verifyPaymentSignature({ orderId, paymentId, signature: valid })).toBe(true);
  });

  test("accepts upper-case hex too", () => {
    expect(verifyPaymentSignature({ orderId, paymentId, signature: valid.toUpperCase() })).toBe(true);
  });

  test("rejects a signature for a different order or payment", () => {
    expect(verifyPaymentSignature({ orderId: "order_OTHER", paymentId, signature: valid })).toBe(false);
    expect(verifyPaymentSignature({ orderId, paymentId: "pay_OTHER", signature: valid })).toBe(false);
  });

  test("rejects a signature made with the wrong secret", () => {
    const forged = hmac("attacker-guess", `${orderId}|${paymentId}`);
    expect(verifyPaymentSignature({ orderId, paymentId, signature: forged })).toBe(false);
  });

  test("rejects malformed signatures without throwing", () => {
    for (const bad of ["", "zz", "deadbeef", valid.slice(1), valid + "00", "not-hex-at-all"]) {
      expect(verifyPaymentSignature({ orderId, paymentId, signature: bad })).toBe(false);
    }
  });
});

describe("verifyWebhookSignature", () => {
  const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_1", order_id: "order_1" } } } });

  test("accepts the signature of the exact raw body", () => {
    expect(verifyWebhookSignature(body, hmac(WEBHOOK_SECRET, body))).toBe(true);
  });

  test("rejects when the body was altered after signing", () => {
    const sig = hmac(WEBHOOK_SECRET, body);
    expect(verifyWebhookSignature(body.replace("pay_1", "pay_2"), sig)).toBe(false);
    expect(verifyWebhookSignature(body + " ", sig)).toBe(false);
  });

  test("rejects a missing or wrong-secret signature", () => {
    expect(verifyWebhookSignature(body, null)).toBe(false);
    expect(verifyWebhookSignature(body, hmac("other", body))).toBe(false);
  });
});
