import { describe, it, expect, beforeEach } from "bun:test";
import { MemoryStorage } from "../../src/storage/memory";
import type { CheckResult } from "../../src/checks/types";

describe("MemoryStorage", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  const makeResult = (
    serviceId: string,
    status: "healthy" | "unhealthy" = "healthy",
    timestamp?: Date
  ): CheckResult => ({
    serviceId,
    status,
    responseTimeMs: 42,
    timestamp: timestamp || new Date(),
  });

  it("should save and retrieve results", async () => {
    await storage.saveResult(makeResult("svc-1"));
    await storage.saveResult(makeResult("svc-1"));

    const results = await storage.getResults("svc-1");
    expect(results.length).toBe(2);
  });

  it("should return latest result", async () => {
    await storage.saveResult(makeResult("svc-1", "healthy"));
    await storage.saveResult(makeResult("svc-1", "unhealthy"));

    const latest = await storage.getLatestResult("svc-1");
    expect(latest).not.toBeNull();
    expect(latest!.status).toBe("unhealthy");
  });

  it("should return null for unknown service", async () => {
    const latest = await storage.getLatestResult("unknown");
    expect(latest).toBeNull();
  });

  it("should calculate uptime", async () => {
    const now = new Date();
    await storage.saveResult(makeResult("svc-1", "healthy", now));
    await storage.saveResult(makeResult("svc-1", "healthy", now));
    await storage.saveResult(makeResult("svc-1", "unhealthy", now));

    const uptime = await storage.getUptime("svc-1");
    expect(uptime).toBeCloseTo(0.6667, 2);
  });

  it("should respect limit parameter", async () => {
    for (let i = 0; i < 10; i++) {
      await storage.saveResult(makeResult("svc-1"));
    }

    const results = await storage.getResults("svc-1", 3);
    expect(results.length).toBe(3);
  });

  it("should get all latest results", async () => {
    await storage.saveResult(makeResult("svc-1", "healthy"));
    await storage.saveResult(makeResult("svc-2", "unhealthy"));

    const latest = await storage.getAllLatest();
    expect(latest.size).toBe(2);
    expect(latest.get("svc-1")!.status).toBe("healthy");
    expect(latest.get("svc-2")!.status).toBe("unhealthy");
  });
});
