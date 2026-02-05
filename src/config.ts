export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  logLevel: process.env.LOG_LEVEL || "info",
  checkIntervalMs: parseInt(process.env.CHECK_INTERVAL_MS || "30000", 10),
};
