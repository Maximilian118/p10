import winston from "winston"

const { combine, timestamp, colorize, printf } = winston.format

// Custom format: "2025-02-13 10:30:00 [info] [OpenF1] ✓ Connected to MQTT broker"
const logFormat = printf(({ level, message, timestamp, prefix }) => {
  const prefixStr = prefix ? ` [${prefix}]` : ""
  return `${timestamp} [${level}]${prefixStr} ${message}`
})

// Base logger instance with console-only transport.
// Level controlled by LOG_LEVEL env var (default: "info").
// Set to "verbose" or "debug" for more detail.
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    colorize(),
    logFormat,
  ),
  transports: [new winston.transports.Console()],
})

// Creates a child logger with an automatic prefix prepended to all messages.
const createLogger = (prefix: string) => {
  return logger.child({ prefix })
}

export { logger, createLogger }
