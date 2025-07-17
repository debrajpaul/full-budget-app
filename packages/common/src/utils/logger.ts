import * as winston from "winston";

const isProduction = process.env.NODE_ENV === "production";

export const logger = winston.createLogger({
  level: isProduction ? "warn" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level}: ${message}`;
    }),
  ),
  transports: [new winston.transports.Console()],
});
