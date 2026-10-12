import { describe, expect, test } from "vitest";
import { defaultVariant, needsSize, variantKey, variantLabel } from "../src/cart";

describe("variantKey", () => {
  test("same product in different colours or sizes are different lines", () => {
    const a = variantKey("p1", { colour: "Teal", size: "M" });
    expect(variantKey("p1", { colour: "Teal", size: "M" })).toBe(a);
    expect(variantKey("p1", { colour: "Red", size: "M" })).not.toBe(a);
    expect(variantKey("p1", { colour: "Teal", size: "L" })).not.toBe(a);
    expect(variantKey("p2", { colour: "Teal", size: "M" })).not.toBe(a);
  });

  test("ignores surrounding whitespace and treats null and empty alike", () => {
    expect(variantKey("p1", { colour: " Teal ", size: null })).toBe(variantKey("p1", { colour: "Teal", size: "" }));
  });
});

describe("defaultVariant and needsSize", () => {
  test("grid cards add the first colour with no size", () => {
    expect(defaultVariant({ colors: [{ name: "Ivory" } as any, { name: "Rose" } as any] })).toEqual({ colour: "Ivory", size: null });
    expect(defaultVariant({ colors: [] })).toEqual({ colour: null, size: null });
  });

  test("products with sizes must be sized before adding", () => {
    expect(needsSize({ sizes: ["S", "M"] })).toBe(true);
    expect(needsSize({ sizes: [] })).toBe(false);
  });
});

describe("variantLabel", () => {
  test("joins the parts that exist", () => {
    expect(variantLabel({ colour: "Teal", size: "M" })).toBe("Teal · M");
    expect(variantLabel({ colour: "Teal", size: null })).toBe("Teal");
    expect(variantLabel({ colour: null, size: "38" })).toBe("38");
    expect(variantLabel({ colour: null, size: null })).toBe("");
  });
});
