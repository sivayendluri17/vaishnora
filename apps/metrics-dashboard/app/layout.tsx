import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vaishnora Metrics Dashboard",
  description: "Observability metrics dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
