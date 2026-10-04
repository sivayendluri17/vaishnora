import type { Metadata } from "next";
import "@vaishnora/ui/styles/globals.css";
import { cormorant, jost } from "./fonts";
import { CartProvider } from "@/context/CartContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { RumMonitor } from "@/components/RumMonitor";

export const metadata: Metadata = {
  title: "Vaishnora — Ethnic Wear, Sarees & Dresses",
  description:
    "Vaishnora is a luxury Indian ethnic wear boutique: handwoven sarees, festive dresses, and heritage craftsmanship in maroon and gold.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${jost.variable}`}>
      <body>
        <RumMonitor />
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
