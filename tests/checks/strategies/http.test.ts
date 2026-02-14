import { describe, it, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { HttpChecker } from "../../../src/checks/strategies/http";
import type { ServiceConfig } from "../../../src/checks/types";

describe("HttpChecker", () => {
  const checker = new HttpChecker();
  let fetchSpy: ReturnType<typeof spyOn>;

  const makeService = (overrides?: Partial<ServiceConfig>): ServiceConfig => ({
    id: "test-service",
    name: "Test Service",
    url: "https://example.com",
    strategy: "http",
    intervalMs: 30000,
    timeoutMs: 5000,
    ...overrides,
  });

  afterEach(() => {
    fetchSpy?.mockRestore();
  });

  it("should return healthy for a 200 response", async () => {
    fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("OK", { status: 200 })
    );

    const result = await checker.check(makeService({ id: "http-ok" }));
    expect(result.status).toBe("healthy");
    expect(result.serviceId).toBe("http-ok");
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("should return unhealthy for a 500 response", async () => {
    fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("Internal Server Error", { status: 500 })
    );

    const result = await checker.check(makeService({ id: "http-500" }));
    expect(result.status).toBe("unhealthy");
  });

  it("should return unhealthy for unreachable host", async () => {
    fetchSpy = spyOn(globalThis, "fetch").mockRejectedValue(
        new Error("Connection refused")
    );

    const result = await checker.check(makeService({
      id: "http-unreachable",
      timeoutMs: 2000,
    }));
    expect(result.status).toBe("unhealthy");
    expect(result.error).toBeDefined();
  });
});