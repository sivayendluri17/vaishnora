import { describe, expect, test } from "vitest";
import {
  DELIVERY, addDays, daysSooner, deliveryFee, deliveryPromise, deliveryPromises, describeDelivery,
  formatPromisedDate, istDate, parseDeliveryOption, promisedDate,
} from "../src/delivery";

// 2026-11-01 20:30 UTC is already 2026-11-02 02:00 in India.
const LATE_EVENING_UTC = new Date("2026-11-01T20:30:00Z");
// 2026-11-01 10:00 UTC is 15:30 the same day in India.
const MIDDAY_UTC = new Date("2026-11-01T10:00:00Z");

describe("delivery options", () => {
  test("the two plans and their prices", () => {
    expect(DELIVERY.regular).toMatchObject({ name: "Regular delivery", fee: 80, days: 8 });
    expect(DELIVERY.priority).toMatchObject({ name: "Priority delivery", fee: 150, days: 3 });
    expect(deliveryFee("regular")).toBe(80);
    expect(deliveryFee("priority")).toBe(150);
    expect(daysSooner()).toBe(5);
  });

  test("anything that is not priority means regular", () => {
    expect(parseDeliveryOption("priority")).toBe("priority");
    expect(parseDeliveryOption("regular")).toBe("regular");
    expect(parseDeliveryOption("express")).toBe("regular");
    expect(parseDeliveryOption(undefined)).toBe("regular");
    expect(parseDeliveryOption(null)).toBe("regular");
  });
});

describe("dates count from the Indian calendar day", () => {
  test("istDate uses India time, not UTC", () => {
    expect(istDate(MIDDAY_UTC)).toBe("2026-11-01");
    expect(istDate(LATE_EVENING_UTC)).toBe("2026-11-02");
  });

  test("addDays crosses month and year ends", () => {
    expect(addDays("2026-11-01", 8)).toBe("2026-11-09");
    expect(addDays("2026-11-28", 3)).toBe("2026-12-01");
    expect(addDays("2026-12-30", 8)).toBe("2027-01-07");
  });

  test("regular is 8 days out, priority 3", () => {
    expect(promisedDate("regular", MIDDAY_UTC)).toBe("2026-11-09");
    expect(promisedDate("priority", MIDDAY_UTC)).toBe("2026-11-04");
    // Ordered after midnight in India: the Indian day has moved on.
    expect(promisedDate("regular", LATE_EVENING_UTC)).toBe("2026-11-10");
  });
});

describe("wording", () => {
  test("long and short date formats", () => {
    expect(formatPromisedDate("2026-11-09", "long")).toBe("Monday, 9 November");
    expect(formatPromisedDate("2026-11-09", "short")).toBe("Mon, 9 Nov");
    expect(formatPromisedDate("2026-11-04")).toBe("Wednesday, 4 November");
    expect(formatPromisedDate("bad")).toBe("");
  });

  test("a promise carries everything a surface needs", () => {
    expect(deliveryPromise("priority", MIDDAY_UTC)).toEqual({
      option: "priority", name: "Priority delivery", fee: 150, days: 3,
      date: "2026-11-04", long: "Wednesday, 4 November", short: "Wed, 4 Nov",
    });
    expect(deliveryPromises(MIDDAY_UTC).map((p) => p.option)).toEqual(["regular", "priority"]);
  });

  test("stored orders describe their promise, old orders just the plan", () => {
    expect(describeDelivery("priority", "2026-11-04")).toBe("Priority delivery · reaches you by Wednesday, 4 November");
    expect(describeDelivery("regular", "2026-11-09", "short")).toBe("Regular delivery · reaches you by Mon, 9 Nov");
    expect(describeDelivery(null, null)).toBe("Regular delivery");
    expect(describeDelivery(undefined, undefined)).toBe("Regular delivery");
  });
});
