"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/lib/products";

export default function AddToCart({ product }: { product: Product }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
      <button
        className="btn btn-primary"
        onClick={() => {
          add(product);
          setAdded(true);
          setTimeout(() => setAdded(false), 1800);
        }}
      >
        {added ? "Added to cart ✦" : "Add to cart"}
      </button>
      <Link href="/cart" className="btn btn-outline">View cart</Link>
    </div>
  );
}
