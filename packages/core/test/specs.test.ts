import { describe, expect, test } from "vitest";
import { ITEM_TYPES, attributesFor, itemType, parseSpecs, specEntries, specFieldsFor, specLabel } from "../src/catalog";

describe("attributes by item type", () => {
  test("every type asks at least a care note, and keys are unique within a type", () => {
    for (const t of ITEM_TYPES) {
      const keys = t.attributes.map((a) => a.key);
      expect(new Set(keys).size).toBe(keys.length);
      expect(keys).toContain("careNote");
    }
  });

  test("a key shared across types always means the same thing", () => {
    const seen = new Map<string, string>();
    for (const t of ITEM_TYPES) for (const a of t.attributes) {
      const sig = `${a.type}|${a.unit ?? ""}`;
      if (seen.has(a.key)) expect(seen.get(a.key)).toBe(sig);
      seen.set(a.key, sig);
    }
  });

  test("accessories measure pack, length, height, width, depth, diameter and weight", () => {
    expect(specFieldsFor("Accessories").map((f) => f.key)).toEqual(["packOf", "lengthIn", "heightIn", "widthIn", "depthIn", "diameterIn", "weightG"]);
    expect(itemType("Accessories").specFields?.length).toBe(7);
  });

  test("sarees ask about the blouse, length and weave; clothing asks fit, sleeve and neckline", () => {
    expect(attributesFor("Sarees").map((a) => a.key)).toEqual(expect.arrayContaining(["blousePiece", "sareeLengthM", "weave", "washCare"]));
    expect(attributesFor("Dresses").map((a) => a.key)).toEqual(expect.arrayContaining(["fit", "sleeve", "neckline", "dressLength"]));
    expect(attributesFor("Ethnic Wear").map((a) => a.key)).toEqual(expect.arrayContaining(["setIncludes", "kurtaLengthIn", "stitching"]));
    expect(attributesFor("Jewellery").map((a) => a.key)).toEqual(expect.arrayContaining(["jewelleryType", "baseMetal", "stoneWork", "necklaceLengthIn"]));
  });
});

describe("parseSpecs", () => {
  test("numbers: positive, one decimal, whole for counts", () => {
    expect(parseSpecs({ heightIn: "4.56", widthIn: 6, weightG: "120" })).toEqual({ heightIn: 4.6, widthIn: 6, weightG: 120 });
    expect(parseSpecs({ packOf: "8.4", lengthIn: "12" })).toEqual({ packOf: 8, lengthIn: 12 });
    expect(parseSpecs({ packOf: "0", heightIn: "-5", weightG: "abc" })).toEqual({});
  });

  test("selects must be one of the options", () => {
    expect(parseSpecs({ washCare: "Dry clean only" })).toEqual({ washCare: "Dry clean only" });
    expect(parseSpecs({ washCare: "Boil it" })).toEqual({});
  });

  test("multis keep known options only, from an array or a comma list", () => {
    expect(parseSpecs({ setIncludes: ["Kurta", "Dupatta", "Hat"] })).toEqual({ setIncludes: ["Kurta", "Dupatta"] });
    expect(parseSpecs({ occasion: "Festive, Wedding" })).toEqual({ occasion: ["Festive", "Wedding"] });
    expect(parseSpecs({ setIncludes: [] })).toEqual({});
  });

  test("text is trimmed and capped; blanks and unknown keys are dropped", () => {
    expect(parseSpecs({ neckline: "  Boat neck  " })).toEqual({ neckline: "Boat neck" });
    expect((parseSpecs({ careNote: "x".repeat(500) }).careNote as string).length).toBe(160);
    expect(parseSpecs({ neckline: "", colour: "red", depthIn: "" })).toEqual({});
  });

  test("tolerates missing or non-object input", () => {
    expect(parseSpecs(undefined)).toEqual({});
    expect(parseSpecs(null)).toEqual({});
    expect(parseSpecs("x")).toEqual({});
  });
});

describe("specEntries and specLabel", () => {
  test("entries follow the type order and format each kind of value", () => {
    const entries = specEntries({ washCare: "Dry clean only", sareeLengthM: 5.5, occasion: ["Festive", "Wedding"], blousePiece: "No blouse" }, "Sarees");
    expect(entries.map((e) => `${e.label}: ${e.value}`)).toEqual([
      "Blouse: No blouse",
      "Saree length: 5.5 m",
      "Occasion: Festive, Wedding",
      "Wash care: Dry clean only",
    ]);
  });

  test("specLabel is the measurements only, pack first and without a unit", () => {
    expect(specLabel({ packOf: 8, lengthIn: 12, use: "Home decor" }, "Accessories")).toBe("Pack of 8 · Length 12 in");
    expect(specLabel({ heightIn: 4 }, "Sarees")).toBe("");
    expect(specLabel({}, "Accessories")).toBe("");
  });
});
