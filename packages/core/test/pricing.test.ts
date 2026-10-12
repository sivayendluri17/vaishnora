import { describe, expect, test } from "vitest";
import { DELIVERY_FEE_INR, MAX_QTY_PER_ITEM, MIN_ONLINE_PAYMENT_PAISE, toPaise, unitPrice } from "../src/pricing";

describe("unitPrice", () => {
  test("uses the sale price only when it is a real discount", () => {
    expect(unitPrice({ price: 1000, salePrice: 800 })).toBe(800);
    expect(unitPrice({ price: 1000, salePrice: null })).toBe(1000);
    expect(unitPrice({ price: 1000, salePrice: 0 })).toBe(1000);
    expect(unitPrice({ price: 1000, salePrice: 1000 })).toBe(1000);
    expect(unitPrice({ price: 1000, salePrice: 1200 })).toBe(1000);
  });
});

describe("toPaise", () => {
  test("converts whole rupees exactly", () => {
    expect(toPaise(579)).toBe(57900);
    expect(toPaise(1)).toBe(100);
  });
  test("rounds fractional rupees instead of truncating", () => {
    expect(toPaise(10.005)).toBe(1001);
    expect(toPaise(0.1 + 0.2)).toBe(30);
  });
});

describe("constants", () => {
  test("delivery fee and limits are what checkout and the server agree on", () => {
    expect(DELIVERY_FEE_INR).toBe(80);
    expect(MIN_ONLINE_PAYMENT_PAISE).toBe(100);
    expect(MAX_QTY_PER_ITEM).toBe(10);
  });
});
