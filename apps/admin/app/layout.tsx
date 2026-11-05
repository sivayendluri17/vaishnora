import type { Metadata } from "next";
import "@vaishnora/ui/styles/globals.css";
import { cormorant, jost } from "./fonts";
import AdminHeader from "@/components/AdminHeader";
import { getAdminUser } from "@vaishnora/core/admin";

export const metadata: Metadata = {
  title: "Vaishnora Admin",
  description: "Boutique management for Vaishnora.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Which tabs to show: vendors get Catalog and Orders, owners everything.
  const user = await getAdminUser().catch(() => null);
  return (
    <html lang="en" className={`${cormorant.variable} ${jost.variable}`}>
      <body>
        <div className="zari-strip" aria-hidden="true" />
        <AdminHeader role={user?.role ?? null} />
        <main>{children}</main>
      </body>
    </html>
  );
}
