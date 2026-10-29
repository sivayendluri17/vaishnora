import { describe, expect, test } from "vitest";
import { colourIndexFor, imageForColour, productPath } from "../src/products";
import type { Product } from "../src/products";

const product = {
  id: "abc", name: "Saree", category: "Sarees", price: 999, swatch: "#000",
  colors: [
    { name: "Black", swatch: "#000", images: [{ url: "https://img/black.jpg" }] },
    { name: "Orange", swatch: "#e80", images: [{ url: "https://img/orange.jpg" }] },
  ],
} as unknown as Product;

describe("productPath", () => {
  test("plain link without a colour", () => {
    expect(productPath("abc")).toBe("/product/abc");
    expect(productPath("abc", null)).toBe("/product/abc");
    expect(productPath("abc", "  ")).toBe("/product/abc");
  });

  test("carries the colour, URL-encoded", () => {
    expect(productPath("abc", "Orange")).toBe("/product/abc?colour=Orange");
    expect(productPath("abc", "Rani Pink")).toBe("/product/abc?colour=Rani%20Pink");
  });
});

describe("colourIndexFor / imageForColour", () => {
  test("finds the colour regardless of case and spacing", () => {
    expect(colourIndexFor(product, "orange")).toBe(1);
    expect(colourIndexFor(product, " Black ")).toBe(0);
    expect(colourIndexFor(product, "Red")).toBe(-1);
    expect(colourIndexFor(product, null)).toBe(-1);
  });

  test("photo follows the chosen colour, first colour otherwise", () => {
    expect(imageForColour(product, "Orange")).toBe("https://img/orange.jpg");
    expect(imageForColour(product, "Red")).toBe("https://img/black.jpg");
  });
});

describe("null-safe helpers", () => {
  test("formatINR never throws on a missing amount", async () => {
    const { formatINR } = await import("../src/format");
    expect(formatINR(1179)).toBe("\u20B91,179");
    expect(formatINR(null)).toBe("\u20B90");
    expect(formatINR(undefined)).toBe("\u20B90");
    expect(formatINR(Number.NaN)).toBe("\u20B90");
  });

  test("descriptionFor falls back to an empty string", async () => {
    const { descriptionFor } = await import("../src/products");
    expect(descriptionFor({ ...product, description: null as unknown as string })).toBe("");
    expect(descriptionFor({ ...product, description: "Main" }, { name: "Black", swatch: "#000", images: [], description: "  " } as never)).toBe("Main");
  });
});
