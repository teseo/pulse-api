import { connect, type Socket } from "net";
import type { HealthChecker, ServiceConfig, CheckResult } from "../types";

export class TcpChecker implements HealthChecker {
  async check(service: ServiceConfig): Promise<CheckResult> {
    const start = Date.now();
    const url = new URL(service.url);
    const host = url.hostname;
    const port = parseInt(url.port || "80", 10);

    return new Promise<CheckResult>((resolve) => {
      const socket: Socket = connect({ host, port }, () => {
        socket.destroy();
        resolve({
          serviceId: service.id,
          status: "healthy",
          responseTimeMs: Date.now() - start,
          timestamp: new Date(),
        });
      });

      socket.setTimeout(service.timeoutMs);

      socket.on("timeout", () => {
        socket.destroy();
        resolve({
          serviceId: service.id,
          status: "unhealthy",
          responseTimeMs: Date.now() - start,
          timestamp: new Date(),
          error: "Connection timed out",
        });
      });

      socket.on("error", (error) => {
        socket.destroy();
        resolve({
          serviceId: service.id,
          status: "unhealthy",
          responseTimeMs: Date.now() - start,
          timestamp: new Date(),
          error: error.message,
        });
      });
    });
  }
}
