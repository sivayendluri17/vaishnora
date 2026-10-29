// Route tests for POST /api/client-error: accepts a crash report, logs it,
// records the metric, and never fails for a malformed body beyond a 400.
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@vaishnora/core/client-crash-metric", () => ({ putClientCrashMetric: vi.fn(async () => true) }));

import { putClientCrashMetric } from "@vaishnora/core/client-crash-metric";
import { POST } from "../app/api/client-error/route";

const post = (body: unknown) => POST(new Request("http://test/api/client-error", { method: "POST", headers: { "user-agent": "TestBrowser/1.0" }, body: typeof body === "string" ? body : JSON.stringify(body) }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("client-error", () => {
  test("records a crash: 204, one log line, one metric datapoint of the right kind", async () => {
    const res = await post({ message: "Loading chunk 18 failed.", name: "ChunkLoadError", url: "https://vaishnora.shop/", where: "page" });
    expect(res.status).toBe(204);
    expect(putClientCrashMetric).toHaveBeenCalledWith("stale-build");
    const line = vi.mocked(console.error).mock.calls[0]?.[0] as string;
    expect(line.startsWith("client-crash ")).toBe(true);
    const logged = JSON.parse(line.slice("client-crash ".length));
    expect(logged).toMatchObject({ message: "Loading chunk 18 failed.", kind: "stale-build", where: "page", ua: "TestBrowser/1.0" });
  });

  test("an ordinary bug is kind other", async () => {
    await post({ message: "Cannot read properties of null (reading 'split')", name: "TypeError" });
    expect(putClientCrashMetric).toHaveBeenCalledWith("other");
  });

  test("rejects a body without a message", async () => {
    expect((await post({})).status).toBe(400);
    expect((await post("not json")).status).toBe(400);
    expect(putClientCrashMetric).not.toHaveBeenCalled();
  });
});
