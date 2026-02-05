import type { ServiceConfig } from "./types";

export class ServiceRegistry {
  private services: Map<string, ServiceConfig> = new Map();

  register(config: ServiceConfig): void {
    if (this.services.has(config.id)) {
      throw new Error(`Service "${config.id}" is already registered`);
    }
    this.services.set(config.id, config);
  }

  unregister(serviceId: string): boolean {
    return this.services.delete(serviceId);
  }

  get(serviceId: string): ServiceConfig | undefined {
    return this.services.get(serviceId);
  }

  getAll(): ServiceConfig[] {
    return Array.from(this.services.values());
  }

  has(serviceId: string): boolean {
    return this.services.has(serviceId);
  }

  get size(): number {
    return this.services.size;
  }
}
