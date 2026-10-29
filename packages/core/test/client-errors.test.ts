import { describe, expect, test } from "vitest";
import { classifyClientError, parseClientErrorReport } from "../src/client-errors";

describe("classifyClientError", () => {
  test("old deploy files are stale-build (a reload fixes them)", () => {
    expect(classifyClientError("Loading chunk 664 failed.", "ChunkLoadError")).toBe("stale-build");
    expect(classifyClientError("Failed to fetch dynamically imported module: https://vaishnora.shop/_next/static/chunks/860-abc.js")).toBe("stale-build");
    expect(classifyClientError("Cannot read properties of undefined (reading 'call')", "TypeError")).toBe("stale-build");
    expect(classifyClientError("Unexpected token '<'", "SyntaxError")).toBe("stale-build");
  });

  test("hydration, storage and network are told apart", () => {
    expect(classifyClientError("Hydration failed because the server rendered HTML didn't match the client.")).toBe("hydration");
    expect(classifyClientError("Minified React error #418; visit https://react.dev/errors/418")).toBe("hydration");
    expect(classifyClientError("Failed to read the 'localStorage' property from 'Window': Access is denied for this document.", "SecurityError")).toBe("storage");
    expect(classifyClientError("Failed to fetch", "TypeError")).toBe("network");
  });

  test("anything else is other", () => {
    expect(classifyClientError("Cannot read properties of null (reading 'split')", "TypeError")).toBe("other");
    expect(classifyClientError(null)).toBe("other");
  });
});

describe("parseClientErrorReport", () => {
  test("rejects bodies without a message", () => {
    expect(parseClientErrorReport(null)).toBeNull();
    expect(parseClientErrorReport("x")).toBeNull();
    expect(parseClientErrorReport({})).toBeNull();
    expect(parseClientErrorReport({ message: "   " })).toBeNull();
  });

  test("trims long fields and classifies", () => {
    const r = parseClientErrorReport({ message: "Loading chunk 1 failed", name: "ChunkLoadError", stack: "x".repeat(10_000), url: "https://vaishnora.shop/", where: "page", extra: 1 });
    expect(r?.kind).toBe("stale-build");
    expect(r?.stack?.length).toBe(4000);
    expect(r?.where).toBe("page");
    expect(r && "extra" in r).toBe(false);
  });
});
