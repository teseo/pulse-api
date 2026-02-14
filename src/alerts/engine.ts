import type { CheckResult } from "../checks/types";
import type { Alert, AlertRule, AlertEngineOptions } from "./types";
import type { Notifier } from "./notifiers/types";
import { createLogger } from "../utils/logger";

const logger = createLogger("AlertEngine");

export class AlertEngine {
  private failureCounts: Map<string, number> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private alertCounter = 0;

  constructor(
    private rules: AlertRule[],
    private notifier: Notifier,
    private options: AlertEngineOptions = {}
  ) {}

  processResult(result: CheckResult): void {
    const matchingRules = this.rules.filter(
      (r) => r.serviceId === result.serviceId
    );

    if (matchingRules.length === 0) return;

    if (result.status === "unhealthy") {
      const current = (this.failureCounts.get(result.serviceId) ?? 0) + 1;
      this.failureCounts.set(result.serviceId, current);

      for (const rule of matchingRules) {
        if (current >= rule.consecutiveFailures && !this.activeAlerts.has(rule.id)) {
          const alert: Alert = {
            id: `alert-${++this.alertCounter}`,
            ruleId: rule.id,
            serviceId: result.serviceId,
            severity: rule.severity,
            status: "active",
            message: rule.description ?? `Service ${result.serviceId} is failing`,
            triggeredAt: new Date(),
            consecutiveFailures: current,
          };

          this.activeAlerts.set(rule.id, alert);
          this.alertHistory.push(alert);

          this.safeNotify({ ...alert });
          this.options.onAlert?.({ ...alert });

          logger.warn("Alert triggered", {
            alertId: alert.id,
            serviceId: alert.serviceId,
            severity: alert.severity,
          });
        }
      }
    } else {
      this.failureCounts.set(result.serviceId, 0);

      for (const rule of matchingRules) {
        const active = this.activeAlerts.get(rule.id);
        if (active) {
          active.status = "resolved";
          active.resolvedAt = new Date();
          this.activeAlerts.delete(rule.id);

          this.safeNotify({ ...active });
          this.options.onResolve?.({ ...active });

          logger.info("Alert resolved", {
            alertId: active.id,
            serviceId: active.serviceId,
          });
        }
      }
    }
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  getAllAlerts(): Alert[] {
    return [...this.alertHistory];
  }

  private safeNotify(alert: Alert): void {
    try {
      this.notifier.notify(alert).catch((err) => {
        logger.error("Notifier failed", {
          alertId: alert.id,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    } catch (err) {
      logger.error("Notifier failed", {
        alertId: alert.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
