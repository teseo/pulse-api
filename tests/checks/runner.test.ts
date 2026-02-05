import { describe, it, expect, beforeEach } from "bun:test";
import { CheckRunner } from "../../src/checks/runner";
import { MemoryStorage } from "../../src/storage/memory";
import type { ServiceConfig, CheckResult } from "../../src/checks/types";

describe("CheckRunner", () => {
  let storage: MemoryStorage;
  let runner: CheckRunner;

  beforeEach(() => {
    storage = new MemoryStorage();
    runner = new CheckRunner(storage);
  });

  it("should run an HTTP check and store the result", async () => {
    const service: ServiceConfig = {
      id: "test-service",
      name: "Test Service",
      url: "https://httpstat.us/200",
      strategy: "http",
      intervalMs: 30000,
      timeoutMs: 5000,
    };

    const result = await runner.runCheck(service);

    expect(result.serviceId).toBe("test-service");
    expect(["healthy", "unhealthy", "degraded"]).toContain(result.status);
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);

    const stored = await storage.getLatestResult("test-service");
    expect(stored).not.toBeNull();
    expect(stored!.serviceId).toBe("test-service");
  });

  it("should throw for unknown strategy", async () => {
    const service: ServiceConfig = {
      id: "bad-service",
      name: "Bad",
      url: "http://localhost",
      strategy: "unknown" as any,
      intervalMs: 30000,
      timeoutMs: 5000,
    };

    expect(runner.runCheck(service)).rejects.toThrow("Unknown check strategy");
  });

  it("should call onResult handlers", async () => {
    const results: CheckResult[] = [];
    runner.onResult((result) => results.push(result));

    const service: ServiceConfig = {
      id: "handler-test",
      name: "Handler Test",
      url: "https://httpstat.us/200",
      strategy: "http",
      intervalMs: 30000,
      timeoutMs: 5000,
    };

    await runner.runCheck(service);

    expect(results.length).toBe(1);
    expect(results[0].serviceId).toBe("handler-test");
  });
});
