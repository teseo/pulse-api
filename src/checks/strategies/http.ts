import type { HealthChecker, ServiceConfig, CheckResult } from "../types";

export class HttpChecker implements HealthChecker {
  async check(service: ServiceConfig): Promise<CheckResult> {
    const start = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), service.timeoutMs);

      const response = await fetch(service.url, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const responseTimeMs = Date.now() - start;

      if (response.ok) {
        return {
          serviceId: service.id,
          status: "healthy",
          responseTimeMs,
          timestamp: new Date(),
        };
      }

      return {
        serviceId: service.id,
        status: response.status >= 500 ? "unhealthy" : "degraded",
        responseTimeMs,
        timestamp: new Date(),
        message: `HTTP ${response.status} ${response.statusText}`,
      };
    } catch (error) {
      return {
        serviceId: service.id,
        status: "unhealthy",
        responseTimeMs: Date.now() - start,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
