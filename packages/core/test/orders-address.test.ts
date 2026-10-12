import { describe, expect, test } from "vitest";
import { parseOrderAddress } from "../src/orders";

const good = {
  customerName: "  Siva  ", mobile: "7799020081", pincode: "522660",
  addressLine1: "15-104, Simhagiri colony", addressLine2: "Main road", landmark: "",
  city: "Nuzendla", state: "Andhra Pradesh",
};

describe("parseOrderAddress", () => {
  test("accepts a complete address and trims it", () => {
    const r = parseOrderAddress(good);
    expect("address" in r).toBe(true);
    if ("address" in r) {
      expect(r.address.customerName).toBe("Siva");
      expect(r.address.landmark).toBe("");
      expect(r.address.state).toBe("Andhra Pradesh");
    }
  });

  test("accepts a mobile number with country code or spaces", () => {
    expect("address" in parseOrderAddress({ ...good, mobile: "+91 77990 20081" })).toBe(true);
  });

  test.each([
    ["missing name", { ...good, customerName: "" }, "required address fields"],
    ["missing city", { ...good, city: "   " }, "required address fields"],
    ["short mobile", { ...good, mobile: "12345" }, "10-digit mobile"],
    ["letters in mobile", { ...good, mobile: "abcdefghij" }, "10-digit mobile"],
    ["5-digit pincode", { ...good, pincode: "52266" }, "6-digit pincode"],
    ["pincode with letters", { ...good, pincode: "52266A" }, "6-digit pincode"],
  ])("rejects %s", (_label, input, message) => {
    const r = parseOrderAddress(input);
    expect("error" in r).toBe(true);
    if ("error" in r) expect(r.error).toContain(message);
  });

  test("survives junk input", () => {
    expect("error" in parseOrderAddress(null)).toBe(true);
    expect("error" in parseOrderAddress("not an object")).toBe(true);
    expect("error" in parseOrderAddress({ customerName: 42 })).toBe(true);
  });

  test("caps very long fields instead of storing them whole", () => {
    const r = parseOrderAddress({ ...good, addressLine1: "x".repeat(500) });
    if ("address" in r) expect(r.address.addressLine1).toHaveLength(200);
    else throw new Error("expected an address");
  });
});
