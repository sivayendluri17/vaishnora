import type { Metadata, Viewport } from "next";
import "@vaishnora/ui/styles/globals.css";
import { cormorant, jost } from "./fonts";
import { CartProvider } from "@/context/CartContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileTabBar from "@/components/MobileTabBar";
import { RumMonitor } from "@/components/RumMonitor";

export const metadata: Metadata = {
  title: "Vaishnora — Ethnic Wear, Sarees & Dresses",
  description:
    "Vaishnora is a luxury Indian ethnic wear boutique: handwoven sarees, festive dresses, and heritage craftsmanship in maroon and gold.",
};

// viewportFit "cover" lets the bottom tab bar extend under the iPhone home
// indicator and pad itself with env(safe-area-inset-bottom).
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

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
          <MobileTabBar />
        </CartProvider>
      </body>
    </html>
  );
}
