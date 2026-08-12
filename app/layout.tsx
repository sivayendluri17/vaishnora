import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Self-hosted fonts — no network fetch at build time (Google Fonts outages
// can no longer break the build). Files live in /public/fonts.
const cormorant = localFont({
  src: [
    { path: "../public/fonts/cormorant-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/cormorant-400-italic.woff2", weight: "400", style: "italic" },
    { path: "../public/fonts/cormorant-500.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/cormorant-600.woff2", weight: "600", style: "normal" },
    { path: "../public/fonts/cormorant-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--cormorant",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

const jost = localFont({
  src: [
    { path: "../public/fonts/jost-300.woff2", weight: "300", style: "normal" },
    { path: "../public/fonts/jost-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/jost-500.woff2", weight: "500", style: "normal" },
  ],
  variable: "--jost",
  display: "swap",
  fallback: ["Helvetica Neue", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Vaishnora — Ethnic Wear, Sarees & Dresses",
  description:
    "Vaishnora is a luxury Indian ethnic wear boutique: handwoven sarees, festive dresses, and heritage craftsmanship in maroon and gold.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${jost.variable}`}>
      <body>
        <CartProvider>
          <div className="zari-strip" aria-hidden="true" />
          <Header />
          <main>{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
