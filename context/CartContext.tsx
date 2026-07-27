"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/products";

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, loaded]);

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
    const total = items.reduce((n, i) => n + i.qty * i.product.price, 0);
    return { items, add, remove, setQty, clear, count, total };
  }, [items]);

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
