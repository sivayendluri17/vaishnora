import { describe, expect, test } from "vitest";
import { orderPaidEmail } from "../src/notify";
import type { OrderDetail } from "../src/orders";

const order: OrderDetail = {
  id: "58bb81e6-1e74-4dd2-816c-15bdf8351613",
  customerName: "Siva Yendluri", mobile: "7799020081", pincode: "522660",
  addressLine1: "15-104, Simhagiri colony", addressLine2: "Main road", landmark: "Near temple",
  city: "Nuzendla", state: "Andhra Pradesh",
  items: [
    { productId: "p1", name: "Mustard Paisley Kurti", colour: "Mustard", size: "M", qty: 2, price: 549 },
    { productId: "p2", name: "Golden deya", colour: null, qty: 1, price: 50 },
  ],
  total: 1228, channel: "online", paymentStatus: "paid",
  paidAt: "2026-10-11T10:28:50.000Z", createdAt: "2026-10-11T10:26:32.000Z",
  razorpayOrderId: "order_TmZFsykVVo9xeI", razorpayPaymentId: "pay_TmZHso3CpAPC9M",
};

describe("orderPaidEmail", () => {
  const { subject, body } = orderPaidEmail(order);

  test("subject names the order, amount and customer", () => {
    expect(subject).toBe("New paid order 58BB81E6: ₹1,228 from Siva Yendluri");
  });

  test("body lists every item with colour, size, quantity and line total", () => {
    expect(body).toContain("Mustard Paisley Kurti (Mustard, M) x 2  ₹1,098");
    expect(body).toContain("Golden deya x 1  ₹50");
  });

  test("body has the full delivery address and mobile", () => {
    expect(body).toContain("Siva Yendluri");
    expect(body).toContain("7799020081");
    expect(body).toContain("15-104, Simhagiri colony, Main road");
    expect(body).toContain("Landmark: Near temple");
    expect(body).toContain("Nuzendla, Andhra Pradesh - 522660");
  });

  test("body carries the payment reference and a dashboard link", () => {
    expect(body).toContain("pay_TmZHso3CpAPC9M");
    expect(body).toContain("order_TmZFsykVVo9xeI");
    expect(body).toContain("https://dashboard.razorpay.com/app/payments/pay_TmZHso3CpAPC9M");
    expect(body).toContain("Order id: 58bb81e6-1e74-4dd2-816c-15bdf8351613");
  });

  test("paid time is shown in India time", () => {
    expect(body).toMatch(/Paid .*2026.* IST/);
  });

  test("omits the landmark line when there is none", () => {
    const { body: b } = orderPaidEmail({ ...order, landmark: "" });
    expect(b).not.toContain("Landmark:");
  });
});
