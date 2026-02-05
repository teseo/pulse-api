type LogLevel = "debug" | "info" | "warn" | "error";

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export function createLogger(context: string, minLevel: LogLevel = "info") {
  const threshold = levels[minLevel];

  const log = (level: LogLevel, message: string, data?: Record<string, unknown>) => {
    if (levels[level] < threshold) return;
    const timestamp = new Date().toISOString();
    const entry = { timestamp, level, context, message, ...data };
    console.log(JSON.stringify(entry));
  };

  return {
    debug: (msg: string, data?: Record<string, unknown>) => log("debug", msg, data),
    info: (msg: string, data?: Record<string, unknown>) => log("info", msg, data),
    warn: (msg: string, data?: Record<string, unknown>) => log("warn", msg, data),
    error: (msg: string, data?: Record<string, unknown>) => log("error", msg, data),
  };
}
