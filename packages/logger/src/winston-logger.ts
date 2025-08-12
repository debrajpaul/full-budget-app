import { ILogger, LogLevel } from "@common";
import winston, { format, transports } from "winston";

export class WinstonLogger implements ILogger {
  private readonly childLoggers: WinstonLogger[] = [];

  private constructor(
    public minLevel: LogLevel,
    private readonly logger?: winston.Logger,
  ) {}

  public static getInstance(
    minLevel: LogLevel,
    loggerName: string = "default",
  ): WinstonLogger {
    const options: winston.LoggerOptions = {
      level: minLevel,
      format: format.combine(
        format.errors({ stack: true }),
        format.timestamp(),
        format.json(),
      ),
      transports: [
        new transports.Console({
          stderrLevels: [LogLevel.ERROR],
          consoleWarnLevels: [LogLevel.WARN, LogLevel.DEBUG],
        }),
      ],
    };
    const logger = winston.createLogger(options).child({
      logger: loggerName,
    });

    return new WinstonLogger(minLevel, logger);
  }

  public static formatError(value: Error | undefined): Error | undefined {
    if (!value) return undefined;
    if (value instanceof Error) {
      return Object.assign(
        {
          stack: value.stack,
          message: value.message,
        },
        value,
      );
    }
    return new Error(`Unknown error: ${JSON.stringify(value)}`);
  }

  public child(loggerName: string, data?: object): ILogger {
    const child = this.logger?.child({
      logger: loggerName,
      ...data,
    });
    const childLogger = new WinstonLogger(this.minLevel, child);
    this.childLoggers.push(childLogger);
    return childLogger;
  }

  log(
    level: LogLevel,
    message: string,
    error?: Error,
    data?: object,
    tags?: string[],
  ): void {
    this.logger?.log(level, message, { error, data, tags });
  }

  error(message: string, data?: object, tags?: string[]): void {
    this.logger?.error(message, { data, tags });
  }

  warn(message: string, data?: object, tags?: string[]): void {
    this.logger?.warn(message, { data, tags });
  }

  info(message: string, data?: object, tags?: string[]): void {
    this.logger?.info(message, { data, tags });
  }

  debug(message: string, data?: object, tags?: string[]): void {
    this.logger?.debug(message, { data, tags });
  }
}
