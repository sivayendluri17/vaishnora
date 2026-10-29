// Indian Rupee formatting: 23999 -> ₹23,999
export function formatINR(amount: number | null | undefined) {
  const n = Number(amount ?? 0);
  return "\u20B9" + (Number.isFinite(n) ? n : 0).toLocaleString("en-IN");
}
