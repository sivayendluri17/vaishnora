import { describe, expect, it } from "vitest";
import {
  activeOccasion,
  indianToday,
  markClosed,
  seenKey,
  shouldShow,
  OCCASIONS,
  type KeyStore,
  type Occasion,
} from "../content/occasions";

const base = { poster: "/festive/x.jpg", width: 1, height: 1, alt: "", href: "/search" };
const diwali: Occasion = { ...base, id: "diwali", from: "2026-11-08", until: "2026-11-11", frequency: "every-visit" };
const quiet: Occasion = { ...base, id: "quiet", from: "2026-12-31", until: "2027-01-02", frequency: "once" };

function memoryStore(): KeyStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

describe("activeOccasion", () => {
  const list = [diwali, quiet];
  it("shows an occasion on its first and last day and not around them", () => {
    expect(activeOccasion("2026-11-07", list)).toBeNull();
    expect(activeOccasion("2026-11-08", list)?.id).toBe("diwali");
    expect(activeOccasion("2026-11-11", list)?.id).toBe("diwali");
    expect(activeOccasion("2026-11-12", list)).toBeNull();
  });
  it("crosses a year boundary", () => {
    expect(activeOccasion("2026-12-31", list)?.id).toBe("quiet");
    expect(activeOccasion("2027-01-02", list)?.id).toBe("quiet");
    expect(activeOccasion("2027-01-03", list)).toBeNull();
  });
});

describe("every-visit frequency", () => {
  it("shows on a fresh visit, hides for the rest of that visit, shows again on a new visit", () => {
    const local = memoryStore();
    let session = memoryStore();
    expect(shouldShow(diwali, "2026-11-08", session, local)).toBe(true);
    markClosed(diwali, "2026-11-08", session, local);
    expect(shouldShow(diwali, "2026-11-08", session, local)).toBe(false);
    // browser closed and reopened: session storage starts empty
    session = memoryStore();
    expect(shouldShow(diwali, "2026-11-08", session, local)).toBe(true);
    // nothing was written to the permanent store
    expect(local.data.size).toBe(0);
  });
  it("greets again the next day even in the same open tab", () => {
    const local = memoryStore();
    const session = memoryStore();
    markClosed(diwali, "2026-11-08", session, local);
    expect(shouldShow(diwali, "2026-11-08", session, local)).toBe(false);
    expect(shouldShow(diwali, "2026-11-09", session, local)).toBe(true);
  });
});

describe("once frequency", () => {
  it("stays hidden across visits once closed", () => {
    const local = memoryStore();
    let session = memoryStore();
    expect(shouldShow(quiet, "2026-12-31", session, local)).toBe(true);
    markClosed(quiet, "2026-12-31", session, local);
    session = memoryStore();
    expect(shouldShow(quiet, "2027-01-01", session, local)).toBe(false);
    expect(local.getItem(seenKey(quiet))).toBe("seen");
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
  it("have sane dates, a unique id and a poster in the festive folder", () => {
    const ids = new Set(OCCASIONS.map((o) => o.id));
    expect(ids.size).toBe(OCCASIONS.length);
    for (const o of OCCASIONS) {
      expect(o.from <= o.until).toBe(true);
      expect(o.poster.startsWith("/festive/")).toBe(true);
    }
  });
});
