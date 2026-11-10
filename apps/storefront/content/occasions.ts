// Festive greetings shown as a poster when the site opens.
//
// HOW TO ADD A NEW OCCASION (Christmas, New Year, Sankranti, Ugadi, Holi, Diwali...)
//   1. Save the poster as apps/storefront/public/festive/<id>.jpg
//      (about 1000 px wide, under 300 KB; a .webp copy with the same name is
//      optional and loads faster).
//   2. Add one entry to OCCASIONS below with the Indian calendar dates.
//   3. Commit, open a pull request, merge. The poster starts showing on the
//      "from" day and disappears by itself after the "until" day.
//
// HOW OFTEN A SHOPPER SEES IT ("frequency"):
//   "every-visit"  Once each time they open the shop. Closing the poster hides
//                  it while they browse; closing the browser (or the tab) and
//                  coming back, or coming back the next day, greets them again.
//   "once"         Once per device for the whole occasion. Use for a quieter
//                  announcement that would annoy if repeated.

export type Frequency = "every-visit" | "once";

export type Occasion = {
  /** Short unique name, also the poster file name. */
  id: string;
  /** First and last day, inclusive, as YYYY-MM-DD in Indian time. */
  from: string;
  until: string;
  /** How often one shopper sees the poster; see the note above. */
  frequency: Frequency;
  /** Poster image in apps/storefront/public/festive/. Leave webp out if you only have a jpg. */
  poster: string;
  posterWebp?: string;
  /** Poster width and height in pixels, so the page reserves the space. */
  width: number;
  height: number;
  /** Spoken description of the poster for screen readers and slow connections. */
  alt: string;
  /** Where a tap on the poster goes. */
  href: string;
};

export const OCCASIONS: Occasion[] = [
  // Nothing running right now. The entries below are kept as ready-made
  // examples: to bring one back, remove the leading slashes, update the dates
  // (and the poster file if it changed), commit and merge.
  //
  // Diwali 2026 (ran 8 to 11 November 2026; the poster files are still in
  // apps/storefront/public/festive/). For Diwali 2027 copy this entry, set the
  // new dates and drop in the new poster.
  // {
  //   id: "diwali-2026",
  //   from: "2026-11-08",
  //   until: "2026-11-11",
  //   frequency: "every-visit",
  //   poster: "/festive/diwali-2026.jpg",
  //   posterWebp: "/festive/diwali-2026.webp",
  //   width: 1000,
  //   height: 1094,
  //   alt: "Vaishnora wishes you a Happy Diwali. May this Diwali bring light to your home, joy to your heart, and prosperity to your life. Celebrate the festive season with sarees, dresses, ethnic wear, jewellery and accessories. Shop now at vaishnora.shop.",
  //   href: "/search",
  // },
  //
  // New Year example:
  // {
  //   id: "new-year-2027",
  //   from: "2026-12-31",
  //   until: "2027-01-02",
  //   frequency: "every-visit",
  //   poster: "/festive/new-year-2027.jpg",
  //   width: 1000,
  //   height: 1094,
  //   alt: "Vaishnora wishes you a Happy New Year 2027.",
  //   href: "/search",
  // },
];

/** Today's date in India as YYYY-MM-DD, whatever the shopper's device clock zone. */
export function indianToday(now = Date.now()): string {
  return new Date(now + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** The occasion running today, or null. If two overlap, the one listed first wins. */
export function activeOccasion(today = indianToday(), list: Occasion[] = OCCASIONS): Occasion | null {
  return list.find((o) => today >= o.from && today <= o.until) ?? null;
}

/** Storage key under which a shopper's "I closed this" note is kept. */
export function seenKey(o: Occasion): string {
  return `vaishnora_greeting_${o.id}`;
}

/** Minimal view of browser storage so the rules below can be unit tested. */
export type KeyStore = { getItem(key: string): string | null; setItem(key: string, value: string): void };

/**
 * Should the poster open now?
 *  - "once": hidden once the permanent (local) store says "seen".
 *  - "every-visit": hidden only while the per-visit (session) store says it was
 *    closed today; a new browser visit or a new day starts fresh.
 */
export function shouldShow(o: Occasion, today: string, session: KeyStore, local: KeyStore): boolean {
  if (o.frequency === "once") return local.getItem(seenKey(o)) !== "seen";
  return session.getItem(seenKey(o)) !== today;
}

/** Record that the shopper closed the poster, in the store that matches the frequency. */
export function markClosed(o: Occasion, today: string, session: KeyStore, local: KeyStore): void {
  if (o.frequency === "once") local.setItem(seenKey(o), "seen");
  else session.setItem(seenKey(o), today);
}
