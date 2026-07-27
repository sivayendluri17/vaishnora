// Temporary in-code catalog. Later, replace with a database or CMS
// (e.g. PostgreSQL like JobSeek, or Sanity/Shopify Storefront API).

export type Product = {
  id: string;
  name: string;
  category: "Sarees" | "Dresses" | "Ethnic Wear";
  price: number; // USD
  fabric: string;
  description: string;
  // CSS gradient used as a placeholder "fabric swatch" until photos exist
  swatch: string;
};

export const products: Product[] = [
  {
    id: "banarasi-rosewood",
    name: "Rosewood Banarasi Silk Saree",
    category: "Sarees",
    price: 289,
    fabric: "Pure Katan silk, zari border",
    description:
      "Handwoven Banarasi silk in deep rosewood maroon with a traditional gold zari border and floral butis across the pallu.",
    swatch: "linear-gradient(135deg,#5e0e26 0%,#8e1d45 45%,#b8325e 70%,#8e1d45 100%)",
  },
  {
    id: "kanjivaram-dusk",
    name: "Dusk Gold Kanjivaram",
    category: "Sarees",
    price: 349,
    fabric: "Kanjivaram silk, temple border",
    description:
      "A dusk-toned Kanjivaram with a broad temple border in antique gold, woven for weddings and evening ceremonies.",
    swatch: "linear-gradient(135deg,#3e0a1c 0%,#7a1230 50%,#c49a4a 120%)",
  },
  {
    id: "anarkali-ivory",
    name: "Ivory Chikankari Anarkali",
    category: "Dresses",
    price: 189,
    fabric: "Georgette, hand embroidery",
    description:
      "Floor-length ivory Anarkali with fine chikankari embroidery and a maroon dupatta edged in gota.",
    swatch: "linear-gradient(135deg,#f7eee1 0%,#e9d8b8 55%,#c49a4a 130%)",
  },
  {
    id: "lehenga-garnet",
    name: "Garnet Bridal Lehenga",
    category: "Ethnic Wear",
    price: 459,
    fabric: "Raw silk, zardozi work",
    description:
      "Garnet raw-silk lehenga with zardozi embroidery, paired with a matching blouse and net dupatta.",
    swatch: "linear-gradient(160deg,#4e0a1e 0%,#7a1230 55%,#a02347 100%)",
  },
  {
    id: "kurta-set-fern",
    name: "Fern & Gold Kurta Set",
    category: "Ethnic Wear",
    price: 129,
    fabric: "Cotton silk",
    description:
      "Everyday elegance: a fern-green cotton-silk kurta set with gold block prints and straight-cut pants.",
    swatch: "linear-gradient(135deg,#2f4a2e 0%,#4d6b45 55%,#c49a4a 130%)",
  },
  {
    id: "sharara-blush",
    name: "Blush Mirror-work Sharara",
    category: "Dresses",
    price: 219,
    fabric: "Georgette, mirror work",
    description:
      "Blush-pink sharara with hand-set mirror work, made for sangeet nights and festive gatherings.",
    swatch: "linear-gradient(135deg,#e8b4c0 0%,#d98aa2 55%,#c49a4a 140%)",
  },
];

export function getProduct(id: string) {
  return products.find((p) => p.id === id);
}
