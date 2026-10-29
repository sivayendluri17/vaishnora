import { describe, expect, test } from "vitest";
import { dominantColour, hexToRgb, nearestColourName, rgbToHex } from "../src/colour";

describe("nearestColourName", () => {
  test.each([
    ["#7b1431", "Maroon"],
    ["#101010", "Black"],
    ["#0f8080", "Teal"],
    ["#e0a81a", "Mustard"],
    ["#d41e78", "Rani Pink"],
    ["#1d2a5a", "Navy"],
    ["#f6f6f6", "White"],
    ["#20593a", "Bottle Green"],
  ])("%s is %s", (hex, name) => {
    expect(nearestColourName(hex).name).toBe(name);
  });
});

describe("hex helpers", () => {
  test("round trip", () => {
    expect(rgbToHex(...hexToRgb("#7a1230"))).toBe("#7a1230");
    expect(hexToRgb("#fff")).toEqual([255, 255, 255]);
  });
});

describe("dominantColour", () => {
  const px = (rgb: [number, number, number], n: number) => Array.from({ length: n }, () => [...rgb, 255]).flat();

  test("ignores a pale studio background and finds the garment colour", () => {
    const data = [...px([245, 240, 232], 300), ...px([122, 18, 48], 120), ...px([130, 22, 50], 40)];
    const hex = dominantColour(data);
    expect(nearestColourName(hex).name).toBe("Maroon");
  });

  test("falls back to everything when the photo is almost all background", () => {
    const data = [...px([245, 240, 232], 300), ...px([122, 18, 48], 5)];
    expect(nearestColourName(dominantColour(data)).name).toMatch(/White|Ivory|Cream/);
  });

  test("a black saree with a red border still reads Black", () => {
    const data = [...px([245, 240, 232], 60), ...px([18, 17, 20], 300), ...px([200, 30, 40], 80)];
    expect(nearestColourName(dominantColour(data)).name).toBe("Black");
  });

  test("vivid fabric beats a larger area of dull skin or wall", () => {
    const data = [...px([205, 170, 140], 200), ...px([216, 27, 116], 120)];
    expect(nearestColourName(dominantColour(data)).name).toBe("Rani Pink");
  });

  test("ignores transparent pixels", () => {
    const data = [...px([0, 128, 0], 50).map((v, i) => (i % 4 === 3 ? 0 : v)), ...px([200, 30, 40], 20)];
    expect(nearestColourName(dominantColour(data)).name).toBe("Red");
  });
});
