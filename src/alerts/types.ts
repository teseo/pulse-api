import type { CheckResult, Severity } from "../checks/types";

export interface AlertRule {
  id: string;
  serviceId: string;
  severity: Severity;
  consecutiveFailures: number; // alert after N consecutive failures
  description?: string;
}

export interface Alert {
  id: string;
  ruleId: string;
  serviceId: string;
  severity: Severity;
  status: "active" | "resolved";
  message: string;
  triggeredAt: Date;
  resolvedAt?: Date;
  consecutiveFailures: number;
}

export interface AlertEngineOptions {
  onAlert?: (alert: Alert) => void;
  onResolve?: (alert: Alert) => void;
}
