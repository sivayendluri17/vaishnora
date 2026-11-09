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
// Shoppers see each occasion once per device. To show the same occasion
// again (say the poster was replaced), bump its "version" number.

export type Occasion = {
  /** Short unique name, also the poster file name. */
  id: string;
  /** Bump this to show the poster again to people who already closed it. */
  version: number;
  /** First and last day, inclusive, as YYYY-MM-DD in Indian time. */
  from: string;
  until: string;
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
  {
    id: "diwali-2026",
    version: 2,
    from: "2026-11-08",
    until: "2026-11-11",
    poster: "/festive/diwali-2026.jpg",
    posterWebp: "/festive/diwali-2026.webp",
    width: 1000,
    height: 1094,
    alt: "Vaishnora wishes you a Happy Diwali. May this Diwali bring light to your home, joy to your heart, and prosperity to your life. Celebrate the festive season with sarees, dresses, ethnic wear, jewellery and accessories. Shop now at vaishnora.shop.",
    href: "/search",
  },
  // Example for the next one (remove the slashes and add the poster file):
  // {
  //   id: "new-year-2027",
  //   version: 1,
  //   from: "2026-12-31",
  //   until: "2027-01-02",
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

/** Browser storage key that remembers a shopper closed this occasion's poster. */
export function seenKey(o: Occasion): string {
  return `vaishnora_greeting_${o.id}_v${o.version}`;
}
