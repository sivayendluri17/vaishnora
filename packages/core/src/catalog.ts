// What each kind of item needs. One definition drives the admin form (which
// fields, sizes, attributes and photo labels to offer) and the storefront (how
// to label and show them). Pure data: safe to import from client components.
//
// To add a new item type, add one entry to ITEM_TYPES. To ask vendors one more
// question about a type, add one field to its `attributes`. Nothing else needs
// to change: the admin renders fields by their `type`, the server validates
// them with parseSpecs, and the product page lists them.

export type SizeGroup = { label: string; values: string[] };

// ---------------------------------------------------------------- attributes

/** How a field is asked and stored. number -> number, select/text -> string, multi -> string[]. */
export type AttributeType = "number" | "select" | "multi" | "text";

export type AttributeField = {
  /** Stored as the key inside products.specs. Shared across types where the meaning is the same. */
  key: string;
  label: string;
  type: AttributeType;
  /** Where the admin shows it: measurements grid or the details grid. */
  group: "measurements" | "details";
  /** number: shown after the value ("4 in"); empty for counts. */
  unit?: string;
  /** number: the word in the admin label ("inches"). */
  unitName?: string;
  /** number: whole numbers only (pack sizes). */
  integer?: boolean;
  /** select / multi: the choices. */
  options?: string[];
  /** text: offered as autocomplete, free text still allowed. */
  suggestions?: string[];
  placeholder?: string;
  hint?: string;
};

/** Values as stored in products.specs. */
export type ProductSpecs = Record<string, number | string | string[]>;
/** Kept for older imports. */
export type SpecField = AttributeField;
export type SpecKey = string;

// -- measurements (numbers)
const num = (key: string, label: string, unit: string, unitName: string, placeholder: string, extra: Partial<AttributeField> = {}): AttributeField =>
  ({ key, label, type: "number", group: "measurements", unit, unitName, placeholder, ...extra });
const HEIGHT_IN = num("heightIn", "Height", "in", "inches", "4.5");
const WIDTH_IN = num("widthIn", "Width", "in", "inches", "6");
const LENGTH_IN = num("lengthIn", "Length", "in", "inches", "12");
const DEPTH_IN = num("depthIn", "Depth", "in", "inches", "3");
const DIAMETER_IN = num("diameterIn", "Diameter", "in", "inches", "12");
const WEIGHT_G = num("weightG", "Weight", "g", "grams", "120");
const PACK_OF = num("packOf", "Pack of", "", "pieces in one pack", "8", { integer: true });
const SAREE_LENGTH_M = num("sareeLengthM", "Saree length", "m", "metres", "5.5");
const BLOUSE_LENGTH_M = num("blouseLengthM", "Blouse piece length", "m", "metres", "0.8");
const KURTA_LENGTH_IN = num("kurtaLengthIn", "Kurta length", "in", "inches", "44");
const DUPATTA_LENGTH_M = num("dupattaLengthM", "Dupatta length", "m", "metres", "2.25");
const NECKLACE_LENGTH_IN = num("necklaceLengthIn", "Necklace length", "in", "inches", "16");
const EARRING_LENGTH_IN = num("earringLengthIn", "Earring drop", "in", "inches", "2");

// -- details (choices and short text)
const sel = (key: string, label: string, options: string[], hint?: string): AttributeField => ({ key, label, type: "select", group: "details", options, hint });
const multi = (key: string, label: string, options: string[], hint?: string): AttributeField => ({ key, label, type: "multi", group: "details", options, hint });
const txt = (key: string, label: string, suggestions: string[], placeholder?: string): AttributeField => ({ key, label, type: "text", group: "details", suggestions, placeholder: placeholder ?? suggestions[0] });

const WASH_CARE = sel("washCare", "Wash care", ["Dry clean only", "Gentle hand wash", "Machine wash cold", "Wipe clean"]);
const OCCASION_WEAR = multi("occasion", "Occasion", ["Daily wear", "Office", "Festive", "Wedding", "Party", "Pooja"]);
const OCCASION_DECOR = multi("occasion", "Occasion", ["Daily use", "Festive", "Wedding", "Pooja", "Gifting", "Housewarming"]);
const SLEEVE = sel("sleeve", "Sleeve", ["Sleeveless", "Cap sleeve", "Short sleeve", "Three-quarter sleeve", "Full sleeve"]);
const NECKLINE = txt("neckline", "Neckline", ["Round", "V-neck", "Boat neck", "Square", "Sweetheart", "Collared", "Mandarin", "Halter", "Keyhole"]);
const FIT = sel("fit", "Fit", ["Regular", "Relaxed", "Slim", "A-line", "Flared", "Straight"]);
const PATTERN = txt("pattern", "Pattern / work", ["Solid", "Printed", "Embroidered", "Floral", "Checks", "Stripes", "Block print", "Kalamkari", "Zari work", "Mirror work", "Sequins"]);
const CARE_NOTE: AttributeField = { key: "careNote", label: "Care note from you (optional)", type: "text", group: "details", suggestions: [], placeholder: "e.g. Iron on reverse, store in a muslin cover" };
const BOX_INCLUDES = txt("includes", "What is in the box", ["Saree with blouse piece", "Necklace and earrings", "Set of 8 mats", "Diya with wick holder"], "What the customer receives");

const LETTER: SizeGroup = { label: "Letter", values: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] };
const NUMERIC: SizeGroup = { label: "Numeric", values: ["32", "34", "36", "38", "40", "42", "44"] };
const FREE: SizeGroup = { label: "Fit", values: ["Free size", "Adjustable"] };

export type ItemType = {
  /** Stored in products.category and used in shop filters. Do not rename lightly. */
  name: string;
  /** One line under the name in the type picker. */
  hint: string;
  /** Label for the products.fabric column: "Fabric" for clothing, "Material" otherwise. */
  materialLabel: string;
  materialPlaceholder: string;
  namePlaceholder: string;
  descriptionPlaceholder: string;
  /** Empty means this type has no sizes and the size picker is hidden. */
  sizeGroups: SizeGroup[];
  sizeHint?: string;
  /** Photo labels offered for this type, most useful first. Stored lowercase in product_images.angle. */
  views: string[];
  /** Questions the admin asks about this type, in display order. */
  attributes: AttributeField[];
  /** Older name for the number-only subset; kept so existing imports compile. */
  specFields?: AttributeField[];
};

export const ITEM_TYPES: ItemType[] = [
  {
    name: "Sarees",
    hint: "Six yards, with or without blouse piece",
    materialLabel: "Fabric",
    materialPlaceholder: "Soft Organza",
    namePlaceholder: "Butterfly Bloom Saree",
    descriptionPlaceholder: "Grace your wardrobe with this elegant saree…",
    sizeGroups: [{ label: "Stitched blouse", values: ["32", "34", "36", "38", "40", "42", "44"] }],
    sizeHint: "Only when a stitched blouse comes with the saree. Leave empty for a blouse piece.",
    views: ["front", "pallu", "border", "draped", "blouse piece", "detail", "back"],
    attributes: [
      sel("blousePiece", "Blouse", ["Unstitched blouse piece included", "Stitched blouse included", "No blouse"]),
      SAREE_LENGTH_M, BLOUSE_LENGTH_M, WEIGHT_G,
      txt("weave", "Weave / craft", ["Handloom", "Banarasi", "Kanjivaram", "Chanderi", "Mangalagiri", "Pochampally ikat", "Linen", "Georgette", "Organza", "Power loom"]),
      PATTERN,
      txt("border", "Border", ["Zari border", "Temple border", "Contrast border", "Small border", "Plain"]),
      txt("pallu", "Pallu", ["Zari pallu", "Printed pallu", "Contrast pallu", "Plain pallu"]),
      OCCASION_WEAR, WASH_CARE, BOX_INCLUDES, CARE_NOTE,
    ],
  },
  {
    name: "Dresses",
    hint: "Gowns, frocks, western and fusion wear",
    materialLabel: "Fabric",
    materialPlaceholder: "Georgette",
    namePlaceholder: "Rosewood Anarkali Gown",
    descriptionPlaceholder: "A flowing silhouette for festive evenings…",
    sizeGroups: [LETTER, NUMERIC, FREE],
    sizeHint: "Tick every size you can supply.",
    views: ["front", "back", "side", "worn", "detail"],
    attributes: [
      FIT,
      sel("dressLength", "Length", ["Mini", "Knee length", "Midi", "Ankle length", "Floor length"]),
      SLEEVE, NECKLINE,
      sel("lining", "Lining", ["Fully lined", "Partly lined", "Unlined"]),
      sel("closure", "Closure", ["Back zip", "Side zip", "Front buttons", "Pull-on", "Tie-up"]),
      PATTERN, OCCASION_WEAR, WASH_CARE, WEIGHT_G, CARE_NOTE,
    ],
  },
  {
    name: "Ethnic Wear",
    hint: "Kurtas, lehengas, salwar and suit sets",
    materialLabel: "Fabric",
    materialPlaceholder: "Chanderi Silk",
    namePlaceholder: "Marigold Kurta Set",
    descriptionPlaceholder: "Hand-finished three-piece set with dupatta…",
    sizeGroups: [LETTER, NUMERIC, FREE],
    sizeHint: "Tick every size you can supply.",
    views: ["front", "back", "side", "worn", "dupatta", "detail"],
    attributes: [
      multi("setIncludes", "Set includes", ["Kurta", "Pant", "Palazzo", "Salwar", "Churidar", "Sharara", "Dupatta", "Lehenga", "Choli / blouse", "Jacket"], "Tick every piece in the set."),
      KURTA_LENGTH_IN, DUPATTA_LENGTH_M, FIT, SLEEVE, NECKLINE, PATTERN,
      sel("stitching", "Stitching", ["Ready to wear", "Semi-stitched", "Unstitched fabric"]),
      OCCASION_WEAR, WASH_CARE, WEIGHT_G, CARE_NOTE,
    ],
  },
  {
    name: "Jewellery",
    hint: "Necklaces, earrings, bangles, sets",
    materialLabel: "Material",
    materialPlaceholder: "American Diamond, gold plated",
    namePlaceholder: "Rani Haar Necklace Set with Earrings",
    descriptionPlaceholder: "Two-layer necklace with matching earrings…",
    sizeGroups: [{ label: "Bangle size", values: ["2.2", "2.4", "2.6", "2.8", "2.10"] }, FREE],
    sizeHint: "Bangle sizes, or Free size / Adjustable. Leave empty for necklaces, earrings and sets.",
    views: ["front", "close-up", "worn", "full set", "back", "packaging"],
    attributes: [
      sel("jewelleryType", "Type", ["Necklace set", "Necklace", "Choker", "Long haaram", "Earrings", "Jhumkas", "Bangles", "Bracelet", "Maang tikka", "Anklets", "Ring", "Nose pin", "Waist belt", "Bridal set"]),
      multi("setIncludes", "Set includes", ["Necklace", "Earrings", "Maang tikka", "Bangles", "Ring", "Nose pin", "Haaram", "Choker", "Waist belt", "Anklets"], "Tick every piece in the set."),
      txt("baseMetal", "Base metal / plating", ["Gold plated brass", "Gold plated alloy", "Matte gold finish", "925 silver", "Oxidised silver", "German silver", "Copper"]),
      txt("stoneWork", "Stones / work", ["American diamond", "Kundan", "Kemp", "Pearl", "Polki", "Meenakari", "Temple work", "Ruby and emerald stones", "Antique finish"]),
      NECKLACE_LENGTH_IN, EARRING_LENGTH_IN, WEIGHT_G,
      sel("closure", "Closure", ["Adjustable dori", "Hook", "Lobster clasp", "Screw back", "Push back", "Openable"]),
      OCCASION_WEAR, BOX_INCLUDES, CARE_NOTE,
    ],
  },
  {
    name: "Accessories",
    hint: "Bags, clutches, home and festive decor",
    materialLabel: "Material",
    materialPlaceholder: "Brass, gold finish",
    namePlaceholder: "Golden Kamal Tea Light Diya",
    descriptionPlaceholder: "A lotus-shaped diya that lights up any corner…",
    sizeGroups: [{ label: "Size", values: ["Free size", "Small", "Medium", "Large"] }],
    sizeHint: "Only if the item comes in more than one size, e.g. a mat in 1 ft and 2 ft. Type your own sizes below.",
    views: ["front", "side", "back", "in use", "detail", "packaging"],
    attributes: [
      PACK_OF, LENGTH_IN, HEIGHT_IN, WIDTH_IN, DEPTH_IN, DIAMETER_IN, WEIGHT_G,
      txt("use", "Used for", ["Home decor", "Pooja", "Gifting", "Table decor", "Wall decor", "Hair accessory", "Bag", "Travel"]),
      OCCASION_DECOR, BOX_INCLUDES, WASH_CARE, CARE_NOTE,
    ],
  },
];

for (const t of ITEM_TYPES) t.specFields = t.attributes.filter((a) => a.type === "number");

export const ITEM_TYPE_NAMES = ITEM_TYPES.map((t) => t.name);

/** Every attribute field across all types, by key, for validation. */
const ALL_FIELDS = new Map<string, AttributeField>();
for (const t of ITEM_TYPES) for (const a of t.attributes) if (!ALL_FIELDS.has(a.key)) ALL_FIELDS.set(a.key, a);

/** Falls back to the first type so an unknown stored category never breaks a form. */
export function itemType(category: string | null | undefined): ItemType {
  return ITEM_TYPES.find((t) => t.name === category) ?? ITEM_TYPES[0];
}

export function isItemType(category: unknown): category is string {
  return typeof category === "string" && ITEM_TYPE_NAMES.includes(category);
}

/** "blouse piece" -> "Blouse piece" for display. */
export function viewLabel(view: string): string {
  return view ? view.charAt(0).toUpperCase() + view.slice(1) : "";
}

/**
 * Views to offer for a photo: this type's list, plus the photo's current label
 * if it came from another type, so changing a product's type never hides or
 * silently drops an existing label.
 */
export function viewOptions(category: string, current?: string): string[] {
  const views = itemType(category).views;
  return current && !views.includes(current) ? [...views, current] : views;
}

/** The attributes a type asks for, in display order. */
export function attributesFor(category: string | null | undefined): AttributeField[] {
  return itemType(category).attributes;
}

/** Number-only subset, kept for older callers. */
export function specFieldsFor(category: string | null | undefined): AttributeField[] {
  return attributesFor(category).filter((a) => a.type === "number");
}

/**
 * Clean attribute values from a form or request body. Unknown keys are
 * dropped. Numbers must be positive (one decimal, or whole for counts);
 * selects must be one of the options; multis keep only known options; text is
 * trimmed to 160 characters. Blank values are dropped, so clearing a box in the
 * admin removes that attribute.
 */
export function parseSpecs(input: unknown): ProductSpecs {
  const out: ProductSpecs = {};
  if (!input || typeof input !== "object") return out;
  for (const [key, raw] of Object.entries(input as Record<string, unknown>)) {
    const field = ALL_FIELDS.get(key);
    if (!field || raw === undefined || raw === null || raw === "") continue;
    switch (field.type) {
      case "number": {
        const n = Number(raw);
        if (!Number.isFinite(n) || n <= 0) break;
        out[key] = field.integer ? Math.round(n) : Math.round(n * 10) / 10;
        break;
      }
      case "select": {
        const v = String(raw).trim();
        if (field.options?.includes(v)) out[key] = v;
        break;
      }
      case "multi": {
        const list = (Array.isArray(raw) ? raw : String(raw).split(",")).map((v) => String(v).trim());
        const kept = (field.options ?? []).filter((o) => list.includes(o));
        if (kept.length) out[key] = kept;
        break;
      }
      case "text": {
        const v = String(raw).trim().slice(0, 160);
        if (v) out[key] = v;
        break;
      }
    }
  }
  return out;
}

export type SpecEntry = { key: string; label: string; value: string; group: AttributeField["group"] };

/** Label and display text for each attribute a product has, in the type's order. */
export function specEntries(specs: ProductSpecs | null | undefined, category: string | null | undefined): SpecEntry[] {
  if (!specs) return [];
  const out: SpecEntry[] = [];
  for (const f of attributesFor(category)) {
    const v = specs[f.key];
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) { if (v.length) out.push({ key: f.key, label: f.label, value: v.join(", "), group: f.group }); continue; }
    if (typeof v === "number") { out.push({ key: f.key, label: f.label, value: `${v}${f.unit ? " " + f.unit : ""}`, group: f.group }); continue; }
    out.push({ key: f.key, label: f.label, value: String(v), group: f.group });
  }
  return out;
}

/** "Height 4 in · Width 6 in · Weight 120 g": the measurements only, one line. */
export function specLabel(specs: ProductSpecs | null | undefined, category: string | null | undefined): string {
  return specEntries(specs, category).filter((e) => e.group === "measurements").map((e) => `${e.label} ${e.value}`).join(" · ");
}
