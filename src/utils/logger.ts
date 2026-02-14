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
    if (process.env.NODE_ENV === "production") {
      const entry = { timestamp, level, context, message, ...data };
      console.log(JSON.stringify(entry));
    } else {
      const color = { debug: "\x1b[90m", info: "\x1b[36m", warn: "\x1b[33m", error: "\x1b[31m" }[level];
      const reset = "\x1b[0m";
      const time = timestamp.split("T")[1].replace("Z", "");
      const extra = data ? " " + Object.entries(data).map(([k, v]) => `${k}=${v}`).join(" ") : "";
      console.log(`${color}${time} [${level.toUpperCase()}]${reset} ${context}: ${message}${extra}`);
    }
  };

  return {
    debug: (msg: string, data?: Record<string, unknown>) => log("debug", msg, data),
    info: (msg: string, data?: Record<string, unknown>) => log("info", msg, data),
    warn: (msg: string, data?: Record<string, unknown>) => log("warn", msg, data),
    error: (msg: string, data?: Record<string, unknown>) => log("error", msg, data),
  };
}
