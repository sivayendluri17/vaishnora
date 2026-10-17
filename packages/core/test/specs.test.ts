import { describe, expect, test } from "vitest";
import { itemType, parseSpecs, specLabel, specFieldsFor } from "../src/catalog";

describe("spec fields by item type", () => {
  test("accessories measure height, width and weight; clothing has none", () => {
    expect(specFieldsFor("Accessories").map((f) => f.key)).toEqual(["heightIn", "widthIn", "weightG"]);
    expect(specFieldsFor("Sarees")).toEqual([]);
    expect(itemType("Accessories").specFields?.length).toBe(3);
  });
});

describe("parseSpecs", () => {
  test("keeps known keys as positive numbers, rounded to one decimal", () => {
    expect(parseSpecs({ heightIn: "4.56", widthIn: 6, weightG: "120" })).toEqual({ heightIn: 4.6, widthIn: 6, weightG: 120 });
  });

  test("drops blanks, zero, negatives, junk and unknown keys", () => {
    expect(parseSpecs({ heightIn: "", widthIn: "0", weightG: "-5", depthIn: 3, colour: "red" })).toEqual({});
    expect(parseSpecs({ heightIn: "abc" })).toEqual({});
  });

  test("tolerates missing or non-object input", () => {
    expect(parseSpecs(undefined)).toEqual({});
    expect(parseSpecs(null)).toEqual({});
    expect(parseSpecs("x")).toEqual({});
  });
});

describe("specLabel", () => {
  test("joins the measurements a type shows, with units, in type order", () => {
    expect(specLabel({ weightG: 120, heightIn: 4, widthIn: 6 }, "Accessories")).toBe("Height 4 in · Width 6 in · Weight 120 g");
  });

  test("skips measurements that are missing", () => {
    expect(specLabel({ heightIn: 4 }, "Accessories")).toBe("Height 4 in");
  });

  test("is empty for types without measurements or products without values", () => {
    expect(specLabel({ heightIn: 4 }, "Sarees")).toBe("");
    expect(specLabel({}, "Accessories")).toBe("");
  });
});
