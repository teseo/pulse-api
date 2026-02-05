import { Router, type Request, type Response } from "express";
import type { AlertEngine } from "../alerts/engine";

/**
 * GET /alerts — returns active alerts from the alert engine.
 *
 * NOTE: This route is defined but NOT yet wired up in index.ts
 * because the AlertEngine is not yet implemented.
 * Part of ticket #4: feat: alert engine with threshold-based rules
 */
export function createAlertsRouter(alertEngine: AlertEngine) {
  const router = Router();

  router.get("/", (_req: Request, res: Response) => {
    const active = alertEngine.getActiveAlerts();
    res.json({
      count: active.length,
      alerts: active,
    });
  });

  router.get("/all", (_req: Request, res: Response) => {
    const all = alertEngine.getAllAlerts();
    res.json({
      count: all.length,
      alerts: all,
    });
  });

  return router;
}
