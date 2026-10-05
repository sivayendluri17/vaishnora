// What each kind of item needs. One definition drives the admin form (which
// fields and photo labels to offer) and the storefront (how to label them).
// Pure data: safe to import from client components.
//
// To add a new item type, add one entry here. Nothing else needs to change.

export type SizeGroup = { label: string; values: string[] };

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
};

const LETTER: SizeGroup = { label: "Letter", values: ["S", "M", "L", "XL", "XXL", "XXXL"] };
const NUMERIC: SizeGroup = { label: "Numeric", values: ["32", "34", "36", "38", "40", "42"] };

export const ITEM_TYPES: ItemType[] = [
  {
    name: "Sarees",
    hint: "Six yards, with or without blouse piece",
    materialLabel: "Fabric",
    materialPlaceholder: "Soft Organza",
    namePlaceholder: "Butterfly Bloom Saree",
    descriptionPlaceholder: "Grace your wardrobe with this elegant saree…",
    sizeGroups: [],
    views: ["front", "pallu", "border", "draped", "blouse piece", "detail", "back"],
  },
  {
    name: "Dresses",
    hint: "Gowns, frocks, western and fusion wear",
    materialLabel: "Fabric",
    materialPlaceholder: "Georgette",
    namePlaceholder: "Rosewood Anarkali Gown",
    descriptionPlaceholder: "A flowing silhouette for festive evenings…",
    sizeGroups: [LETTER, NUMERIC],
    sizeHint: "Tick every size you can supply.",
    views: ["front", "back", "side", "worn", "detail"],
  },
  {
    name: "Ethnic Wear",
    hint: "Kurtas, lehengas, salwar and suit sets",
    materialLabel: "Fabric",
    materialPlaceholder: "Chanderi Silk",
    namePlaceholder: "Marigold Kurta Set",
    descriptionPlaceholder: "Hand-finished three-piece set with dupatta…",
    sizeGroups: [LETTER, NUMERIC],
    sizeHint: "Tick every size you can supply.",
    views: ["front", "back", "side", "worn", "dupatta", "detail"],
  },
  {
    name: "Jewellery",
    hint: "Necklaces, earrings, bangles, sets",
    materialLabel: "Material",
    materialPlaceholder: "American Diamond, gold plated",
    namePlaceholder: "Rani Haar Necklace Set with Earrings",
    descriptionPlaceholder: "Two-layer necklace with matching earrings…",
    sizeGroups: [{ label: "Bangle size", values: ["2.2", "2.4", "2.6", "2.8", "2.10"] }],
    sizeHint: "Only for bangles. Leave empty for necklaces, earrings and sets.",
    views: ["front", "close-up", "worn", "full set", "back", "packaging"],
  },
  {
    name: "Accessories",
    hint: "Bags, clutches, home and festive decor",
    materialLabel: "Material",
    materialPlaceholder: "Brass, gold finish",
    namePlaceholder: "Golden Kamal Tea Light Diya",
    descriptionPlaceholder: "A lotus-shaped diya that lights up any corner…",
    sizeGroups: [],
    views: ["front", "side", "back", "in use", "detail", "packaging"],
  },
];

export const ITEM_TYPE_NAMES = ITEM_TYPES.map((t) => t.name);

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
