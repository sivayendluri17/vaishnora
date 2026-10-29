"use client";

// Desktop-only cart rail on the shop and product pages: subtotal, one-click
// checkout, and a quantity control per line.

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { imageForColour, productPath } from "@vaishnora/core/products";
import { variantLabel } from "@vaishnora/core/cart";
import Price from "./Price";

export default function CartStrip() {
  const { items, count, total, setQty } = useCart();
  const pathname = usePathname();
  const [isDesktop, setIsDesktop] = useState(false);

  // Desktop-only
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Only on search + product detail pages
  const onAllowedPage =
    pathname === "/search" || pathname.startsWith("/product/");

  if (!isDesktop) return null;
  if (!onAllowedPage) return null;
  if (count === 0) return null;

  return (
    <aside className="cartstrip" aria-label="Cart summary">
      <div className="cartstrip-top">
        <span className="cartstrip-subtotal-label">Subtotal</span>
        <Price amount={total} size="sm" className="cartstrip-subtotal" />
        <Link href="/checkout" className="cartstrip-go">Checkout</Link>
        <Link href="/cart" className="cartstrip-cart-link">View cart</Link>
      </div>
      <div className="cartstrip-items">
        {items.map(({ key, product, qty, colour, size }) => {
          const thumb = imageForColour(product, colour);
          const price = product.salePrice != null && product.salePrice > 0 && product.salePrice < product.price
            ? product.salePrice
            : product.price;
          const label = [product.name, variantLabel({ colour, size })].filter(Boolean).join(" · ");
          return (
            <div key={key} className="cartstrip-item">
              <Link href={productPath(product.id, colour)} className="cartstrip-product-link" title={label}>
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb}
                    alt={product.name}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
                  />
                ) : (
                  <span className="cartstrip-swatch" style={{ background: product.swatch ?? "var(--parchment)" }} />
                )}
              </Link>
              <Price amount={price} size="sm" className="cartstrip-price" />
              <div className="cartstrip-controls" role="group" aria-label={`Quantity for ${label}`}>
                <button type="button" aria-label={`Remove one ${label} from cart`} onClick={() => setQty(key, qty - 1)}>−</button>
                <span aria-live="polite" aria-atomic="true">{qty}</span>
                <button type="button" aria-label={`Add one ${label} to cart`} onClick={() => setQty(key, qty + 1)}>+</button>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
