// One way to show money everywhere: lining numerals in the body font with a
// lighter, smaller rupee sign, optional struck-through original price and an
// "x% off" pill. Sizes come from the `size` prop so cards, cart rows and the
// product page all share the same look at their own scale.

import { formatINR } from "@vaishnora/core/format";

type Size = "sm" | "md" | "lg" | "xl";

export default function Price({
  amount,
  original,
  size = "md",
  showOff = true,
  className = "",
}: {
  amount: number;
  /** Pre-discount price; shown struck through when it is higher than `amount`. */
  original?: number | null;
  size?: Size;
  showOff?: boolean;
  className?: string;
}) {
  const hasOffer = original != null && original > amount;
  const off = hasOffer ? Math.round(((original - amount) / original) * 100) : 0;
  const digits = formatINR(amount).slice(1);
  return (
    <span className={`money money-${size} ${className}`.trim()}>
      <span className="money-now"><span className="money-sym">₹</span>{digits}</span>
      {hasOffer && <s className="money-was">{formatINR(original)}</s>}
      {hasOffer && showOff && off > 0 && <span className="money-off">{off}% off</span>}
    </span>
  );
}
