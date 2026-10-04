import localFont from "next/font/local";

// Self-hosted brand fonts live in packages/ui/fonts so both apps render the
// same type without a network fetch at build time.
export const cormorant = localFont({
  src: [
    { path: "../../../packages/ui/fonts/cormorant-400.woff2", weight: "400", style: "normal" },
    { path: "../../../packages/ui/fonts/cormorant-400-italic.woff2", weight: "400", style: "italic" },
    { path: "../../../packages/ui/fonts/cormorant-500.woff2", weight: "500", style: "normal" },
    { path: "../../../packages/ui/fonts/cormorant-600.woff2", weight: "600", style: "normal" },
    { path: "../../../packages/ui/fonts/cormorant-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--cormorant",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const jost = localFont({
  src: [
    { path: "../../../packages/ui/fonts/jost-300.woff2", weight: "300", style: "normal" },
    { path: "../../../packages/ui/fonts/jost-400.woff2", weight: "400", style: "normal" },
    { path: "../../../packages/ui/fonts/jost-500.woff2", weight: "500", style: "normal" },
  ],
  variable: "--jost",
  display: "swap",
  fallback: ["Helvetica Neue", "Arial", "sans-serif"],
});
