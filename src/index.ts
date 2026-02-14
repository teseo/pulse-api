import express from "express";
import { config } from "./config";
import { ServiceRegistry } from "./checks/registry";
import { CheckRunner } from "./checks/runner";
import { MemoryStorage } from "./storage/memory";
import healthRouter from "./routes/health";
import { createServicesRouter } from "./routes/services";
// import { createAlertsRouter } from "./routes/alerts";  // TODO: uncomment when AlertEngine is implemented
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
// app.use("/alerts", createAlertsRouter(alertEngine));  // TODO: wire up when AlertEngine is implemented

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

// Start periodic checks
runner.startPeriodicChecks(registry.getAll());

app.listen(config.port, () => {
  logger.info(`Pulse API running on port ${config.port}`, {
    services: registry.size,
  });
});

export { app, storage, registry, runner };
