import { Router, type Request, type Response } from "express";
import type { ServiceRegistry } from "../checks/registry";
import type { StorageAdapter } from "../storage/types";

export function createServicesRouter(
  registry: ServiceRegistry,
  storage: StorageAdapter
) {
  const router = Router();

  router.get("/", async (_req: Request, res: Response) => {
    const services = registry.getAll();
    const latest = await storage.getAllLatest();

    const result = services.map((svc) => ({
      id: svc.id,
      name: svc.name,
      url: svc.url,
      strategy: svc.strategy,
      lastCheck: latest.get(svc.id) || null,
    }));

    res.json({ services: result });
  });

  router.get("/:id/history", async (req: Request, res: Response) => {
    const serviceId = req.params.id;

    if (!registry.has(serviceId)) {
      res.status(404).json({ error: `Service "${serviceId}" not found` });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const results = await storage.getResults(serviceId, limit);
    const uptime = await storage.getUptime(serviceId);

    res.json({
      serviceId,
      uptime: Math.round(uptime * 10000) / 100, // percentage with 2 decimals
      history: results,
    });
  });

  return router;
}
