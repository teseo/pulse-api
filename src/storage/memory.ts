import type { CheckResult } from "../checks/types";
import type { StorageAdapter } from "./types";

const DEFAULT_LIMIT = 100;
const DEFAULT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export class MemoryStorage implements StorageAdapter {
  private results: Map<string, CheckResult[]> = new Map();

  async saveResult(result: CheckResult): Promise<void> {
    const existing = this.results.get(result.serviceId) || [];
    existing.push(result);

    // Keep only the last 1000 results per service
    if (existing.length > 1000) {
      existing.splice(0, existing.length - 1000);
    }

    this.results.set(result.serviceId, existing);
  }

  async getResults(serviceId: string, limit: number = DEFAULT_LIMIT): Promise<CheckResult[]> {
    const results = this.results.get(serviceId) || [];
    return results.slice(-limit);
  }

  async getLatestResult(serviceId: string): Promise<CheckResult | null> {
    const results = this.results.get(serviceId) || [];
    return results.length > 0 ? results[results.length - 1] : null;
  }

  async getUptime(serviceId: string, windowMs: number = DEFAULT_WINDOW_MS): Promise<number> {
    const results = this.results.get(serviceId) || [];
    const cutoff = new Date(Date.now() - windowMs);

    const windowResults = results.filter((r) => r.timestamp >= cutoff);
    if (windowResults.length === 0) return 0;

    const healthy = windowResults.filter((r) => r.status === "healthy").length;
    return healthy / windowResults.length;
  }

  async getAllLatest(): Promise<Map<string, CheckResult>> {
    const latest = new Map<string, CheckResult>();
    for (const [serviceId, results] of this.results) {
      if (results.length > 0) {
        latest.set(serviceId, results[results.length - 1]);
      }
    }
    return latest;
  }
}
