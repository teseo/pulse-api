import type { CheckResult } from "../checks/types";

export interface StorageAdapter {
  saveResult(result: CheckResult): Promise<void>;
  getResults(serviceId: string, limit?: number): Promise<CheckResult[]>;
  getLatestResult(serviceId: string): Promise<CheckResult | null>;
  getUptime(serviceId: string, windowMs?: number): Promise<number>;
  getAllLatest(): Promise<Map<string, CheckResult>>;
}
