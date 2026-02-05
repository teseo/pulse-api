import type { ServiceConfig, CheckResult, HealthChecker } from "./types";
import type { StorageAdapter } from "../storage/types";
import { HttpChecker } from "./strategies/http";
import { TcpChecker } from "./strategies/tcp";
import { createLogger } from "../utils/logger";

const logger = createLogger("CheckRunner");

type CheckResultHandler = (result: CheckResult) => void;

export class CheckRunner {
  private checkers: Map<string, HealthChecker> = new Map();
  private intervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private handlers: CheckResultHandler[] = [];

  constructor(private storage: StorageAdapter) {
    this.checkers.set("http", new HttpChecker());
    this.checkers.set("tcp", new TcpChecker());
  }

  onResult(handler: CheckResultHandler): void {
    this.handlers.push(handler);
  }

  async runCheck(service: ServiceConfig): Promise<CheckResult> {
    const checker = this.checkers.get(service.strategy);
    if (!checker) {
      throw new Error(`Unknown check strategy: ${service.strategy}`);
    }

    const result = await checker.check(service);
    await this.storage.saveResult(result);

    logger.info("Check completed", {
      serviceId: service.id,
      status: result.status,
      responseTimeMs: result.responseTimeMs,
    });

    for (const handler of this.handlers) {
      try {
        handler(result);
      } catch (error) {
        logger.error("Handler error", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return result;
  }

  startPeriodicChecks(services: ServiceConfig[]): void {
    for (const service of services) {
      this.runCheck(service);

      const interval = setInterval(() => {
        this.runCheck(service);
      }, service.intervalMs);

      this.intervals.set(service.id, interval);
    }

    logger.info("Periodic checks started", { count: services.length });
  }

  stopAll(): void {
    for (const [id, interval] of this.intervals) {
      clearInterval(interval);
      this.intervals.delete(id);
    }
    logger.info("All checks stopped");
  }
}
