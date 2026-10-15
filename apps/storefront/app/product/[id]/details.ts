// Static copy for the product page accordions, by item type. Lives here, not
// in the database, because it rarely changes and applies to every product of
// a type. Edit the words, not the structure.

import { DELIVERY_FEE_INR } from "@vaishnora/core/pricing";

export const CARE_BY_CATEGORY: Record<string, string[]> = {
  Sarees: [
    "Dry clean recommended for the first wash; gentle hand wash in cold water afterwards.",
    "Do not wring. Dry in shade, away from direct sun, to keep the colours bright.",
    "Iron on low heat with a cotton cloth over embroidery and zari.",
    "Store folded in a muslin or cotton cover; refold along different lines every few months.",
  ],
  "Ethnic Wear": [
    "Gentle hand wash or machine wash on delicate, cold water, with similar colours.",
    "Turn inside out before washing to protect prints and embroidery.",
    "Dry in shade. Iron on medium heat; avoid ironing directly on embellishments.",
  ],
  Dresses: [
    "Gentle hand wash or machine wash on delicate, cold water, with similar colours.",
    "Do not bleach. Dry flat or hang in shade.",
    "Iron on low to medium heat, inside out.",
  ],
  Jewellery: [
    "Wipe with a soft dry cloth after wearing and store in the pouch or box provided.",
    "Keep away from perfume, water and sweat to preserve the plating and stones.",
    "Put jewellery on last when dressing and remove it first when undressing.",
  ],
  Accessories: [
    "Wipe clean with a soft dry cloth.",
    "Keep away from moisture and direct heat.",
  ],
};

export const DELIVERY_POINTS = [
  `Delivered anywhere in India. Flat delivery charge of ₹${DELIVERY_FEE_INR} per order.`,
  "Orders are packed and dispatched within 2 to 3 working days; delivery usually takes 4 to 7 days after dispatch.",
  "Pay online by UPI, card or net banking, secured by Razorpay, or place the order over WhatsApp or Instagram and settle with us directly.",
  "Questions about an order? Message us on WhatsApp from the Support page and we reply the same day.",
];

export const SIZE_GUIDE = [
  "Sizes follow standard Indian ready-to-wear measurements. If you are between two sizes, choose the larger one for a relaxed fit.",
  "Bust: measure around the fullest part, keeping the tape level. Waist: around the narrowest part. Hip: around the fullest part.",
  "Not sure? Send us your measurements on WhatsApp and we will suggest the size.",
];
