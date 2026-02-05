import type { Alert } from "../types";
import type { Notifier } from "./types";
import { createLogger } from "../../utils/logger";

const logger = createLogger("ConsoleNotifier");

export class ConsoleNotifier implements Notifier {
  async notify(alert: Alert): Promise<void> {
    if (alert.status === "active") {
      logger.warn(`ALERT [${alert.severity}]: ${alert.message}`, {
        serviceId: alert.serviceId,
        ruleId: alert.ruleId,
        consecutiveFailures: alert.consecutiveFailures,
      });
    } else {
      logger.info(`RESOLVED: ${alert.message}`, {
        serviceId: alert.serviceId,
        ruleId: alert.ruleId,
        resolvedAt: alert.resolvedAt?.toISOString(),
      });
    }
  }
}
