import { describe, it, expect } from "bun:test";
import { HttpChecker } from "../../../src/checks/strategies/http";
import type { ServiceConfig } from "../../../src/checks/types";

describe("HttpChecker", () => {
  const checker = new HttpChecker();

  it("should return healthy for a 200 response", async () => {
    const service: ServiceConfig = {
      id: "http-ok",
      name: "HTTP OK",
      url: "https://httpstat.us/200",
      strategy: "http",
      intervalMs: 30000,
      timeoutMs: 5000,
    };

    const result = await checker.check(service);
    expect(result.status).toBe("healthy");
    expect(result.serviceId).toBe("http-ok");
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("should return unhealthy for a 500 response", async () => {
    const service: ServiceConfig = {
      id: "http-500",
      name: "HTTP 500",
      url: "https://httpstat.us/500",
      strategy: "http",
      intervalMs: 30000,
      timeoutMs: 5000,
    };

    const result = await checker.check(service);
    expect(result.status).toBe("unhealthy");
  });

  it("should return unhealthy for unreachable host", async () => {
    const service: ServiceConfig = {
      id: "http-unreachable",
      name: "Unreachable",
      url: "http://192.0.2.1:9999",
      strategy: "http",
      intervalMs: 30000,
      timeoutMs: 2000,
    };

    const result = await checker.check(service);
    expect(result.status).toBe("unhealthy");
    expect(result.error).toBeDefined();
  });
});
