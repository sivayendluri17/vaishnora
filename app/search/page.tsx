import { Suspense } from "react";
import SearchClient from "./SearchClient";

export const metadata = { title: "Shop — Vaishnora" };

export default function SearchPage() {
  return (
    <Suspense>
      <SearchClient />
    </Suspense>
  );
}
