"use client";

import { useId, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/products";
import { formatINR } from "@/lib/format";
import { thumbnailFor } from "@/lib/products";

type ProductSearchBoxProps = {
  products: Product[];
  value: string;
  onChange: (value: string) => void;
  formClassName: string;
  wrapperClassName: string;
  placeholder: string;
  ariaLabel: string;
  onFocus?: () => void;
};

export default function ProductSearchBox({
  products,
  value,
  onChange,
  formClassName,
  wrapperClassName,
  placeholder,
  ariaLabel,
  onFocus,
}: ProductSearchBoxProps) {
  const router = useRouter();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const suggestions = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return [];

    const matches: { product: Product; score: number; order: number }[] = [];
    products.forEach((product, order) => {
      const name = (product.name ?? "").toLowerCase();
      const category = (product.category ?? "").toLowerCase();
      const fields = [name, category, product.fabric, product.description, product.asin]
        .filter((field): field is string => typeof field === "string")
        .map((field) => field.toLowerCase());
      if (!fields.some((field) => field.includes(query))) return;

      const score = name.startsWith(query)
        ? 0
        : category.startsWith(query)
          ? 1
          : fields.some((field) => field.split(/\s+/).some((word) => word.startsWith(query)))
            ? 2
            : 3;
      matches.push({ product, score, order });
    });

    return matches
      .sort((a, b) => a.score - b.score || a.order - b.order)
      .slice(0, 6)
      .map(({ product }) => product);
  }, [products, value]);

  function goToProduct(product: Product) {
    setOpen(false);
    router.push(`/product/${product.id}`);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selected = suggestions[activeIndex];
    if (selected) {
      goToProduct(selected);
      return;
    }
    const query = value.trim();
    setOpen(false);
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && suggestions.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp" && suggestions.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const showSuggestions = open && value.trim().length > 0;

  return (
    <div
      className={`product-search-wrap ${wrapperClassName}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <form className={formClassName} role="search" onSubmit={submit}>
        <input
          type="search"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setActiveIndex(-1);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(value.trim().length > 0);
            onFocus?.();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={ariaLabel}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
          aria-controls={showSuggestions ? listId : undefined}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        />
        <button type="submit" aria-label="Search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>
        </button>
      </form>

      {showSuggestions && (
        <div className="product-search-suggestions">
          {suggestions.length > 0 ? (
            <ul id={listId} role="listbox" aria-label="Product suggestions">
              {suggestions.map((product, index) => {
                const image = thumbnailFor(product);
                const price = product.salePrice != null && product.salePrice > 0 && product.salePrice < product.price
                  ? product.salePrice
                  : product.price;
                return (
                  <li key={product.id} role="presentation">
                    <button
                      id={`${listId}-${index}`}
                      type="button"
                      role="option"
                      aria-selected={index === activeIndex}
                      className="product-search-suggestion"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => goToProduct(product)}
                    >
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image} alt="" loading="lazy" />
                      ) : (
                        <span className="product-search-swatch" style={{ background: product.swatch ?? "var(--parchment)" }} />
                      )}
                      <span className="product-search-copy">
                        <strong>{product.name}</strong>
                        <small>{product.category}</small>
                      </span>
                      <span className="product-search-price">{formatINR(price)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="product-search-empty">No matching products</p>
          )}
          <button
            type="button"
            className="product-search-all"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              const query = value.trim();
              setOpen(false);
              router.push(`/search?q=${encodeURIComponent(query)}`);
            }}
          >
            See all results for “{value.trim()}”
          </button>
        </div>
      )}
    </div>
  );
}