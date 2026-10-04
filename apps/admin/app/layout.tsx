import type { Metadata } from "next";
import "@vaishnora/ui/styles/globals.css";
import { cormorant, jost } from "./fonts";
import AdminHeader from "@/components/AdminHeader";

export const metadata: Metadata = {
  title: "Vaishnora Admin",
  description: "Boutique management for Vaishnora.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${jost.variable}`}>
      <body>
        <div className="zari-strip" aria-hidden="true" />
        <AdminHeader />
        <main>{children}</main>
      </body>
    </html>
  );
}
