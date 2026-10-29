// Colour naming for product photos. The admin reads the dominant colour of a
// photo in the browser (see apps/admin form-parts detectColour) and this maps
// that hex to the nearest boutique colour name, so vendors get "Maroon" and a
// matching swatch filled in without choosing by hand. Pure: safe anywhere.

export type NamedColour = { name: string; hex: string };

/** Names shoppers recognise, biased to ethnic-wear vocabulary. Keep hexes representative, not pretty. */
export const NAMED_COLOURS: NamedColour[] = [
  { name: "Black", hex: "#1a1a1a" },
  { name: "Charcoal", hex: "#3d3d3d" },
  { name: "Grey", hex: "#8a8a8a" },
  { name: "Silver", hex: "#c0c0c0" },
  { name: "White", hex: "#f4f4f4" },
  { name: "Ivory", hex: "#f3ead8" },
  { name: "Cream", hex: "#efe1c6" },
  { name: "Beige", hex: "#d9c3a3" },
  { name: "Gold", hex: "#c9a24a" },
  { name: "Mustard", hex: "#d4a017" },
  { name: "Yellow", hex: "#f2d230" },
  { name: "Orange", hex: "#e8702a" },
  { name: "Peach", hex: "#f2b89a" },
  { name: "Coral", hex: "#ef7a6a" },
  { name: "Red", hex: "#c8202a" },
  { name: "Maroon", hex: "#7a1230" },
  { name: "Wine", hex: "#5e1a3a" },
  { name: "Rani Pink", hex: "#d81b74" },
  { name: "Pink", hex: "#ee8fb4" },
  { name: "Baby Pink", hex: "#f5c6d6" },
  { name: "Magenta", hex: "#b4257a" },
  { name: "Purple", hex: "#6a2d9c" },
  { name: "Lavender", hex: "#b9a4d9" },
  { name: "Navy", hex: "#1f2c5c" },
  { name: "Royal Blue", hex: "#2b4fb8" },
  { name: "Sky Blue", hex: "#8fc3ea" },
  { name: "Teal", hex: "#137a7a" },
  { name: "Turquoise", hex: "#2aa9b8" },
  { name: "Bottle Green", hex: "#1f5a3a" },
  { name: "Green", hex: "#2e8b3d" },
  { name: "Olive", hex: "#7a7a2e" },
  { name: "Mint", hex: "#b4e3c9" },
  { name: "Brown", hex: "#6b3f1f" },
  { name: "Rust", hex: "#a4471f" },
  { name: "Copper", hex: "#b56b3a" },
  { name: "Tan", hex: "#c99a6b" },
];

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

// sRGB -> CIELAB, so "nearest" matches how eyes see colour, not raw RGB distance.
function toLab([r, g, b]: [number, number, number]): [number, number, number] {
  const lin = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = (R * 0.2126 + G * 0.7152 + B * 0.0722) / 1.0;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}

/** The boutique colour name closest to a hex, e.g. "#7b1431" -> "Maroon". */
export function nearestColourName(hex: string): NamedColour {
  const lab = toLab(hexToRgb(hex));
  let best = NAMED_COLOURS[0];
  let bestD = Infinity;
  for (const c of NAMED_COLOURS) {
    const l = toLab(hexToRgb(c.hex));
    const d = (lab[0] - l[0]) ** 2 + (lab[1] - l[1]) ** 2 + (lab[2] - l[2]) ** 2;
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

/**
 * Dominant colour of an image from its pixels (RGBA bytes, as canvas
 * getImageData gives). Product photos are mostly background (studio wall,
 * table, a model's skin), so the fabric is found in three tries:
 *   1. vivid pixels only, each bucket weighted by how saturated it is, so a
 *      rani-pink dupatta beats a beige wall and a hand holding earrings;
 *   2. if too few pixels are vivid, or most of the picture is dark (a black
 *      saree with a coloured border), all pixels except the pale background
 *      and deep shadow, so black, white, ivory and grey items read right;
 *   3. if still nothing, every pixel.
 * Among the groups of similar pixels the fullest wins, with a nudge towards
 * saturated and lit ones, so the sunlit body of a kurta beats its shaded
 * folds. Returns the average colour of the winning group.
 */
export function dominantColour(data: Uint8ClampedArray | number[]): string {
  type Bucket = { n: number; r: number; g: number; b: number; sat: number; light: number };
  const buckets = new Map<string, Bucket>();
  const add = (r: number, g: number, b: number, sat: number, light: number) => {
    const key = `${r >> 5},${g >> 5},${b >> 5}`;
    const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0, sat: 0, light: 0 };
    e.n++; e.r += r; e.g += g; e.b += b; e.sat += sat; e.light += light;
    buckets.set(key, e);
  };
  let counted = 0;
  let opaque = 0;
  let dark = 0;
  let used: "vivid" | "nonbg" | "all" = "vivid";
  const pass = (mode: "vivid" | "nonbg" | "all") => {
    used = mode; buckets.clear(); counted = 0; opaque = 0; dark = 0;
    for (let i = 0; i + 3 < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 128) continue;
      opaque++;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const light = (max + min) / 510;
      const sat = max === 0 ? 0 : (max - min) / max;
      if (light < 0.2) dark++;
      if (mode === "vivid" && (sat < 0.3 || light < 0.08 || light > 0.92)) continue;
      if (mode === "nonbg" && ((light > 0.82 && sat < 0.22) || light < 0.06)) continue; // background / deep shadow
      add(r, g, b, sat, light); counted++;
    }
  };
  pass("vivid");
  const mostlyDark = dark >= opaque * 0.45 && dark > counted;
  if (counted < 40 || counted < opaque * 0.1 || mostlyDark) pass("nonbg");
  if (counted < 40) pass("all");
  let best: Bucket | null = null;
  let bestScore = -1;
  for (const e of buckets.values()) {
    // weight by mean saturation so skin and walls (dull) lose to fabric (vivid);
    // among vivid pixels also a little by lightness, so the lit body of a
    // garment beats its shadows (never for dark items, or black would lose)
    const score = e.n * (0.2 + e.sat / e.n) * (used === "vivid" ? 0.4 + e.light / e.n : 1);
    if (score > bestScore) { bestScore = score; best = e; }
  }
  if (!best) return "#7a1230";
  return rgbToHex(best.r / best.n, best.g / best.n, best.b / best.n);
}
