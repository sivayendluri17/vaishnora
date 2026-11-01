// Delivery options and the date we tell the shopper. One source for every
// surface (product page, cards, cart, checkout, emails, admin), so the dates
// never disagree. Pure and client-safe: no server imports.
//
// The promise is deliberately simple: a calendar date counted from the day
// the order is placed (India time). Regular reaches the shopper within 8
// days, Priority within 3. No cutoff, no pincode zones, no working days: the
// dates are padded enough to be kept, which matters more than being clever.

export type DeliveryOption = "regular" | "priority";

export type DeliveryPlan = {
  id: DeliveryOption;
  /** "Regular delivery" / "Priority delivery": the name shoppers see. */
  name: string;
  /** Rupees per order, replacing (not adding to) the other option's fee. */
  fee: number;
  /** Calendar days from order day to the promised date. */
  days: number;
  /** The "Details" note on the product page. */
  note: string;
};

export const DELIVERY: Record<DeliveryOption, DeliveryPlan> = {
  regular: {
    id: "regular",
    name: "Regular delivery",
    fee: 80,
    days: 8,
    note: "Your order is packed within 2 days and reaches you by the date shown, anywhere in India. The ₹80 is one charge for the whole order, however many items you add. We message you on WhatsApp when it is on its way.",
  },
  priority: {
    id: "priority",
    name: "Priority delivery",
    fee: 150,
    days: 3,
    note: "Your order is packed the same day and sent by the fastest courier we have, so it reaches you by the date shown, usually within 3 days. Choose Priority at checkout. The ₹150 replaces the ₹80 Regular charge, it is not added on top.",
  },
};

export const DELIVERY_OPTION_IDS: DeliveryOption[] = ["regular", "priority"];

/** Shown under both Details notes. */
export const DELIVERY_NOTE_FOOTER = "Dates count from the day you order. Order today and these are your dates.";

/** Unknown or missing input means Regular, never an error. */
export function parseDeliveryOption(v: unknown): DeliveryOption {
  return v === "priority" ? "priority" : "regular";
}

export function deliveryFee(option: DeliveryOption): number {
  return DELIVERY[option].fee;
}

/** How many days sooner Priority is than Regular, for "5 days sooner". */
export function daysSooner(): number {
  return DELIVERY.regular.days - DELIVERY.priority.days;
}

const IST = "Asia/Kolkata";

/** The India calendar date of an instant, as "YYYY-MM-DD". */
export function istDate(at: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD; the time zone makes it the Indian day.
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

/** Add calendar days to a "YYYY-MM-DD" date. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** The date this option promises for an order placed at `at`: "YYYY-MM-DD". */
export function promisedDate(option: DeliveryOption, at: Date = new Date()): string {
  return addDays(istDate(at), DELIVERY[option].days);
}

/**
 * "Sunday, 9 November" (long) or "Sun, 9 Nov" (short). The year is left out
 * on purpose: a promise is always within the next few weeks.
 */
export function formatPromisedDate(iso: string, style: "long" | "short" = "long"): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = date.toLocaleDateString("en-GB", { weekday: style, timeZone: "UTC" });
  const month = date.toLocaleDateString("en-GB", { month: style, timeZone: "UTC" });
  return `${weekday}, ${d} ${month}`;
}

export type DeliveryPromise = {
  option: DeliveryOption;
  name: string;
  fee: number;
  days: number;
  /** "YYYY-MM-DD" */
  date: string;
  /** "Sunday, 9 November" */
  long: string;
  /** "Sun, 9 Nov" */
  short: string;
};

export function deliveryPromise(option: DeliveryOption, at: Date = new Date()): DeliveryPromise {
  const plan = DELIVERY[option];
  const date = promisedDate(option, at);
  return { option, name: plan.name, fee: plan.fee, days: plan.days, date, long: formatPromisedDate(date, "long"), short: formatPromisedDate(date, "short") };
}

/** Regular first, then Priority. */
export function deliveryPromises(at: Date = new Date()): DeliveryPromise[] {
  return DELIVERY_OPTION_IDS.map((o) => deliveryPromise(o, at));
}

/**
 * The line for a stored order: "Priority delivery · reaches you by Tuesday, 4 November".
 * Orders from before delivery options have no promised date and read "Regular delivery".
 */
export function describeDelivery(option: DeliveryOption | null | undefined, promisedBy: string | null | undefined, style: "long" | "short" = "long"): string {
  const plan = DELIVERY[parseDeliveryOption(option)];
  const when = promisedBy ? formatPromisedDate(promisedBy, style) : "";
  return when ? `${plan.name} · reaches you by ${when}` : plan.name;
}
