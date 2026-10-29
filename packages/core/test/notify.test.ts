import { describe, expect, test } from "vitest";
import { orderPaidEmail } from "../src/notify";
import type { OrderDetail } from "../src/orders";

const order: OrderDetail = {
  id: "58bb81e6-1e74-4dd2-816c-15bdf8351613",
  customerName: "Siva Yendluri", mobile: "7799020081", pincode: "522660",
  addressLine1: "15-104, Simhagiri colony", addressLine2: "Main road", landmark: "Near temple",
  city: "Nuzendla", state: "Andhra Pradesh",
  items: [
    { productId: "p1", name: "Mustard Paisley Kurti", colour: "Mustard", size: "M", qty: 2, price: 549, asin: "VSH0062", imageUrl: "https://images.example/kurti.jpg" },
    { productId: "p2", name: "Golden deya", colour: null, qty: 1, price: 50, asin: "VSH0070" },
  ],
  total: 1228, channel: "online", paymentStatus: "paid",
  paidAt: "2026-10-11T10:28:50.000Z", createdAt: "2026-10-11T10:26:32.000Z",
  razorpayOrderId: "order_TmZFsykVVo9xeI", razorpayPaymentId: "pay_TmZHso3CpAPC9M",
};

describe("orderPaidEmail", () => {
  const { subject, body, html } = orderPaidEmail(order);

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

  test("every item carries its product code and product link", () => {
    expect(body).toContain("Code VSH0062");
    expect(body).toContain("/product/p1?colour=Mustard");
    expect(html).toContain("/product/p1?colour=Mustard");
    expect(html).toContain("VSH0062");
    expect(html).toContain('href="https://images.example/kurti.jpg"'.replace("href", "src"));
    expect(html).toContain("/product/p2");
    expect(html).toContain("Colour: <b>Mustard</b>");
    expect(html).toContain("Size: <b>M</b>");
  });

  test("html escapes customer text", () => {
    const { html: h } = orderPaidEmail({ ...order, customerName: "A <b>&</b> B" });
    expect(h).toContain("A &lt;b&gt;&amp;&lt;/b&gt; B");
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
