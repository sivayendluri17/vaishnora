"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/products";
import { thumbnailFor } from "@/lib/products";

export type CartItem = { product: Product; qty: number };

type CartCtx = {
  items: CartItem[];
  add: (p: Product) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  count: number;
  total: number;
};

const CartContext = createContext<CartCtx | null>(null);
const KEY = "vaishnora_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load saved cart (product id + qty) from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  // Persist cart on change
  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, loaded]);

  // HYDRATE: whenever the cart has items, re-fetch fresh product data so
  // image URLs (which expire), price, and stock are always current.
  useEffect(() => {
    if (!loaded || items.length === 0) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/products", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const fresh: Product[] = data.products ?? [];
        const byId = new Map(fresh.map((p) => [p.id, p]));

        setItems((prev) => {
          let changed = false;
          const next = prev
            .map((item) => {
              const updated = byId.get(item.product.id);
              if (!updated) return item; // keep as-is if not found (don't drop silently)
              // Only replace if the fresh copy differs (avoids render loops)
              const oldThumb = thumbnailFor(item.product);
              const newThumb = thumbnailFor(updated);
              if (
                oldThumb !== newThumb ||
                item.product.price !== updated.price ||
                item.product.salePrice !== updated.salePrice ||
                item.product.inStock !== updated.inStock
              ) {
                changed = true;
                return { ...item, product: updated };
              }
              return item;
            });
          return changed ? next : prev;
        });
      } catch {
        // offline or error — keep the stored copy
      }
    })();

    return () => { cancelled = true; };
    // Re-run when the SET of product ids changes (not on every qty tick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, items.map((i) => i.product.id).join(",")]);

  const api = useMemo<CartCtx>(() => {
    const add = (p: Product) =>
      setItems((prev) => {
        const found = prev.find((i) => i.product.id === p.id);
        if (found) return prev.map((i) => (i.product.id === p.id ? { ...i, qty: i.qty + 1 } : i));
        return [...prev, { product: p, qty: 1 }];
      });
    const remove = (id: string) => setItems((prev) => prev.filter((i) => i.product.id !== id));
    const setQty = (id: string, qty: number) =>
      setItems((prev) =>
        qty <= 0 ? prev.filter((i) => i.product.id !== id)
                 : prev.map((i) => (i.product.id === id ? { ...i, qty } : i))
      );
    const clear = () => setItems([]);
    const count = items.reduce((n, i) => n + i.qty, 0);
    // total uses the live price (salePrice if on offer)
    const total = items.reduce((n, i) => {
      const p = i.product;
      const unit = p.salePrice != null && p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : p.price;
      return n + i.qty * unit;
    }, 0);
    return { items, add, remove, setQty, clear, count, total };
  }, [items]);

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
