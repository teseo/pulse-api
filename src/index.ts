import express from "express";
import { config } from "./config";
import { ServiceRegistry } from "./checks/registry";
import { CheckRunner } from "./checks/runner";
import { MemoryStorage } from "./storage/memory";
import healthRouter from "./routes/health";
import { createServicesRouter } from "./routes/services";
import { createAlertsRouter } from "./routes/alerts";
import { AlertEngine } from "./alerts/engine";
import { ConsoleNotifier } from "./alerts/notifiers/console";
import { createLogger } from "./utils/logger";

const logger = createLogger("Server");

const app = express();
app.use(express.json());

// Infrastructure
const storage = new MemoryStorage();
const registry = new ServiceRegistry();
const runner = new CheckRunner(storage);

// Routes
app.use("/health", healthRouter);
app.use("/services", createServicesRouter(registry, storage));
const alertEngine = new AlertEngine(
    [
      { id: "rule-api", serviceId: "api-gateway", severity: "critical", consecutiveFailures: 3, description: "API Gateway is down" },
      { id: "rule-auth", serviceId: "auth-service", severity: "warning", consecutiveFailures: 2, description: "Auth Service is failing" },
      { id: "rule-payment", serviceId: "payment-service", severity: "critical", consecutiveFailures: 3, description: "Payment Service is down" },
    ],
    new ConsoleNotifier()
);
app.use("/alerts", createAlertsRouter(alertEngine));

// Register some demo services
registry.register({
  id: "api-gateway",
  name: "API Gateway",
  url: "https://httpbingo.org/status/200",
  strategy: "http",
  intervalMs: 30000,
  timeoutMs: 5000,
});

registry.register({
  id: "auth-service",
  name: "Auth Service",
  url: "https://httpbingo.org/status/200",
  strategy: "http",
  intervalMs: 30000,
  timeoutMs: 5000,
});

registry.register({
  id: "payment-service",
  name: "Payment Service",
  url: "https://httpbingo.org/status/503",
  strategy: "http",
  intervalMs: 30000,
  timeoutMs: 5000,
});

// Connect alert engine to check runner
runner.onResult((result) => alertEngine.processResult(result));

// Start periodic checks
runner.startPeriodicChecks(registry.getAll());

app.listen(config.port, () => {
  logger.info(`Pulse API running on port ${config.port}`, {
    services: registry.size,
  });
});

export { app, storage, registry, runner, alertEngine };
