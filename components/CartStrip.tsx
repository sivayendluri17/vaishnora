"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { formatINR } from "@/lib/format";
import { thumbnailFor } from "@/lib/products";

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
        <span className="cartstrip-subtotal">{formatINR(total)}</span>
        <Link href="/cart" className="cartstrip-go">Go to cart</Link>
      </div>
      <div className="cartstrip-items">
        {items.map(({ product, qty }) => {
          const thumb = thumbnailFor(product);
          const price = product.salePrice != null && product.salePrice > 0 && product.salePrice < product.price
            ? product.salePrice
            : product.price;
          return (
            <div key={product.id} className="cartstrip-item">
              <Link href={`/product/${product.id}`} className="cartstrip-product-link" title={product.name}>
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
              <span className="cartstrip-price" aria-label={`Price ${formatINR(price)}`}>{formatINR(price)}</span>
              <div className="cartstrip-controls" role="group" aria-label={`Quantity for ${product.name}`}>
                <button
                  type="button"
                  aria-label={`Remove one ${product.name} from cart`}
                  onClick={() => setQty(product.id, qty - 1)}
                >
                  −
                </button>
                <span aria-live="polite" aria-atomic="true">{qty}</span>
                <button
                  type="button"
                  aria-label={`Add one ${product.name} to cart`}
                  onClick={() => setQty(product.id, qty + 1)}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
