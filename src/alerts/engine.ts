import type { CheckResult } from "../checks/types";
import type { Alert, AlertRule, AlertEngineOptions } from "./types";
import type { Notifier } from "./notifiers/types";
import { createLogger } from "../utils/logger";

const logger = createLogger("AlertEngine");

export class AlertEngine {
  private failureCounts: Map<string, number> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private allAlerts: Alert[] = [];

  constructor(
    private rules: AlertRule[],
    private notifier: Notifier,
    private options: AlertEngineOptions = {}
  ) {
    const seen = new Set<string>();
    for (const rule of rules) {
      if (seen.has(rule.id)) {
        throw new Error(`Duplicate rule id: ${rule.id}`);
      }
      seen.add(rule.id);
    }
  }

  processResult(result: CheckResult): void {
    const matchingRules = this.rules.filter(
      (rule) => rule.serviceId === result.serviceId
    );

    if (matchingRules.length === 0) return;

    // Update failure count once per result, not per rule
    if (result.status !== "healthy") {
      const count = (this.failureCounts.get(result.serviceId) ?? 0) + 1;
      this.failureCounts.set(result.serviceId, count);
    } else {
      this.failureCounts.set(result.serviceId, 0);
    }

    const count = this.failureCounts.get(result.serviceId)!;

    for (const rule of matchingRules) {
      if (result.status !== "healthy") {
        if (
          count >= rule.consecutiveFailures &&
          !this.activeAlerts.has(rule.id)
        ) {
          const alert: Alert = {
            id: `alert-${rule.id}-${Date.now()}`,
            ruleId: rule.id,
            serviceId: result.serviceId,
            severity: rule.severity,
            status: "active",
            message: rule.description ?? `Service ${result.serviceId} is failing`,
            triggeredAt: new Date(),
            consecutiveFailures: count,
          };

          this.activeAlerts.set(rule.id, alert);
          this.allAlerts.push(alert);
          this.notifier.notify(alert).catch((err) =>
            logger.error("Notifier failed", { error: String(err) })
          );
          this.options.onAlert?.(alert);
        }
      } else {
        const existing = this.activeAlerts.get(rule.id);
        if (existing) {
          existing.status = "resolved";
          existing.resolvedAt = new Date();
          this.activeAlerts.delete(rule.id);
          this.notifier.notify(existing).catch((err) =>
            logger.error("Notifier failed", { error: String(err) })
          );
          this.options.onResolve?.(existing);
        }
      }
    }
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  getAllAlerts(): Alert[] {
    return [...this.allAlerts];
  }
}
