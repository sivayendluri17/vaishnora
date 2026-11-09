import { describe, expect, it } from "vitest";
import { activeOccasion, indianToday, seenKey, OCCASIONS, type Occasion } from "../content/occasions";

const sample: Occasion[] = [
  { id: "diwali", version: 1, from: "2026-11-08", until: "2026-11-11", poster: "/festive/diwali.jpg", width: 1, height: 1, alt: "", href: "/search" },
  { id: "new-year", version: 3, from: "2026-12-31", until: "2027-01-02", poster: "/festive/ny.jpg", width: 1, height: 1, alt: "", href: "/search" },
];

describe("activeOccasion", () => {
  it("shows an occasion on its first and last day and not around them", () => {
    expect(activeOccasion("2026-11-07", sample)).toBeNull();
    expect(activeOccasion("2026-11-08", sample)?.id).toBe("diwali");
    expect(activeOccasion("2026-11-11", sample)?.id).toBe("diwali");
    expect(activeOccasion("2026-11-12", sample)).toBeNull();
  });

  it("crosses a year boundary", () => {
    expect(activeOccasion("2026-12-31", sample)?.id).toBe("new-year");
    expect(activeOccasion("2027-01-02", sample)?.id).toBe("new-year");
    expect(activeOccasion("2027-01-03", sample)).toBeNull();
  });

  it("includes the version in the remembered key so a bump shows the poster again", () => {
    expect(seenKey(sample[0])).toBe("vaishnora_greeting_diwali_v1");
    expect(seenKey(sample[1])).toBe("vaishnora_greeting_new-year_v3");
  });
});

describe("indianToday", () => {
  it("uses the Indian calendar day, not the device's", () => {
    // 20:00 UTC on 7 Nov is already 01:30 on 8 Nov in India.
    expect(indianToday(Date.UTC(2026, 10, 7, 20, 0))).toBe("2026-11-08");
    // 18:00 UTC on 7 Nov is still 23:30 on 7 Nov in India.
    expect(indianToday(Date.UTC(2026, 10, 7, 18, 0))).toBe("2026-11-07");
  });
});

describe("configured occasions", () => {
  it("have sane dates and a unique id", () => {
    const ids = new Set(OCCASIONS.map((o) => o.id));
    expect(ids.size).toBe(OCCASIONS.length);
    for (const o of OCCASIONS) {
      expect(o.from <= o.until).toBe(true);
      expect(o.poster.startsWith("/festive/")).toBe(true);
    }
  });
});
