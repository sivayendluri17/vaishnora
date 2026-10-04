// Indian Rupee formatting: 23999 -> ₹23,999
export function formatINR(amount: number) {
  return "\u20B9" + amount.toLocaleString("en-IN");
}
