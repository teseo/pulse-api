export type CheckStatus = "healthy" | "unhealthy" | "degraded";
export type Severity = "critical" | "warning" | "info";
export type CheckStrategy = "http" | "tcp";

export interface ServiceConfig {
  id: string;
  name: string;
  url: string;
  strategy: CheckStrategy;
  intervalMs: number;
  timeoutMs: number;
  metadata?: Record<string, string>;
}

export interface CheckResult {
  serviceId: string;
  status: CheckStatus;
  responseTimeMs: number;
  timestamp: Date;
  message?: string;
  error?: string;
}

export interface HealthChecker {
  check(service: ServiceConfig): Promise<CheckResult>;
}
