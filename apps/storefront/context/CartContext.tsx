"use client";

// The shopper's cart, kept in localStorage. A line is a product in one colour
// and one size (see @vaishnora/core/cart), so the chosen variant travels all
// the way to checkout and the order record.

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Product } from "@vaishnora/core/products";
import { thumbnailFor } from "@vaishnora/core/products";
import { defaultVariant, variantKey, type Variant } from "@vaishnora/core/cart";

export type CartItem = { key: string; product: Product; qty: number; colour: string | null; size: string | null };

type CartCtx = {
  items: CartItem[];
  /** Add one of a variant (defaults to the first colour, no size). Returns the line key. */
  add: (p: Product, variant?: Partial<Variant>) => string;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  /** The line for this exact variant, if in the cart. */
  find: (productId: string, variant: Variant) => CartItem | undefined;
  /** Any line of this product, whatever the colour or size (for grid cards). */
  findProduct: (productId: string) => CartItem | undefined;
  count: number;
  total: number;
};

const CartContext = createContext<CartCtx | null>(null);
const KEY = "vaishnora_cart_v2";
const LEGACY_KEY = "vaishnora_cart_v1";

type StoredV1 = { product: Product; qty: number };

function load(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
    // One-time upgrade of the old cart: every old line was the first colour, no size.
    const old = localStorage.getItem(LEGACY_KEY);
    if (old) {
      const items = (JSON.parse(old) as StoredV1[]).map((i) => {
        const v = defaultVariant(i.product);
        return { key: variantKey(i.product.id, v), product: i.product, qty: i.qty, ...v };
      });
      localStorage.removeItem(LEGACY_KEY);
      return items;
    }
  } catch {}
  return [];
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setItems(load());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, loaded]);

  // HYDRATE: whenever the cart has items, re-fetch fresh product data so
  // image URLs, price and stock are always current.
  useEffect(() => {
    if (!loaded || items.length === 0) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/products", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const fresh: Product[] = data.products ?? [];
        const byId = new Map(fresh.map((p) => [p.id, p]));

        setItems((prev) => {
          let changed = false;
          const next = prev.map((item) => {
            const updated = byId.get(item.product.id);
            if (!updated) return item; // keep as-is if not found (don't drop silently)
            if (
              thumbnailFor(item.product) !== thumbnailFor(updated) ||
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
    const add = (p: Product, variant?: Partial<Variant>) => {
      const v: Variant = { ...defaultVariant(p), ...variant };
      const key = variantKey(p.id, v);
      setItems((prev) => {
        const found = prev.find((i) => i.key === key);
        if (found) return prev.map((i) => (i.key === key ? { ...i, qty: i.qty + 1 } : i));
        return [...prev, { key, product: p, qty: 1, colour: v.colour, size: v.size }];
      });
      return key;
    };
    const remove = (key: string) => setItems((prev) => prev.filter((i) => i.key !== key));
    const setQty = (key: string, qty: number) =>
      setItems((prev) =>
        qty <= 0 ? prev.filter((i) => i.key !== key)
                 : prev.map((i) => (i.key === key ? { ...i, qty } : i))
      );
    const clear = () => setItems([]);
    const find = (productId: string, variant: Variant) => {
      const key = variantKey(productId, variant);
      return items.find((i) => i.key === key);
    };
    const findProduct = (productId: string) => items.find((i) => i.product.id === productId);
    const count = items.reduce((n, i) => n + i.qty, 0);
    // total uses the live price (salePrice if on offer)
    const total = items.reduce((n, i) => {
      const p = i.product;
      const unit = p.salePrice != null && p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : p.price;
      return n + i.qty * unit;
    }, 0);
    return { items, add, remove, setQty, clear, find, findProduct, count, total };
  }, [items]);

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
