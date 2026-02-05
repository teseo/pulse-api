import type { CheckResult } from "../checks/types";
import type { Alert, AlertRule, AlertEngineOptions } from "./types";
import type { Notifier } from "./notifiers/types";
import { createLogger } from "../utils/logger";

const logger = createLogger("AlertEngine");

/**
 * AlertEngine evaluates check results against defined rules
 * and triggers alerts when thresholds are breached.
 *
 * It should:
 * - Track consecutive failures per service
 * - Trigger an alert when consecutiveFailures reaches the rule threshold
 * - Auto-resolve alerts when a service recovers (healthy check)
 * - Notify via the Notifier interface on alert and resolve
 * - Expose active alerts via getActiveAlerts()
 *
 * This is currently a stub — the implementation is pending.
 * See tests/alerts/engine.test.ts for expected behaviour.
 */
export class AlertEngine {
  constructor(
    private rules: AlertRule[],
    private notifier: Notifier,
    private options: AlertEngineOptions = {}
  ) {
    // TODO: Implement — initialise internal tracking state
  }

  /**
   * Process a check result and evaluate it against rules.
   * Called by the CheckRunner via the onResult handler.
   */
  processResult(result: CheckResult): void {
    // TODO: Implement
    // - Find rules matching result.serviceId
    // - If unhealthy: increment consecutive failure count
    // - If consecutive failures >= rule threshold: create alert
    // - If healthy: reset failure count, resolve any active alerts
    throw new Error("AlertEngine.processResult() not implemented");
  }

  /**
   * Get all currently active (unresolved) alerts.
   */
  getActiveAlerts(): Alert[] {
    // TODO: Implement
    throw new Error("AlertEngine.getActiveAlerts() not implemented");
  }

  /**
   * Get all alerts (active and resolved).
   */
  getAllAlerts(): Alert[] {
    // TODO: Implement
    throw new Error("AlertEngine.getAllAlerts() not implemented");
  }
}
