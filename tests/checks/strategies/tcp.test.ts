import { describe, it, expect } from "bun:test";
import { TcpChecker } from "../../../src/checks/strategies/tcp";
import type { ServiceConfig } from "../../../src/checks/types";

describe("TcpChecker", () => {
  const checker = new TcpChecker();

  it("should return unhealthy for unreachable port", async () => {
    const service: ServiceConfig = {
      id: "tcp-down",
      name: "TCP Down",
      url: "http://localhost:19999",
      strategy: "tcp",
      intervalMs: 30000,
      timeoutMs: 2000,
    };

    const result = await checker.check(service);
    expect(result.status).toBe("unhealthy");
    expect(result.error).toBeDefined();
  });
});
