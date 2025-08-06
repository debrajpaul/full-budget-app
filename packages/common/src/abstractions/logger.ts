export enum LogLevel {
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  DEBUG = "debug",
}

export interface ILogger {
  readonly minLevel: LogLevel;
  child(loggerName: string, data?: object): ILogger;
  info(message: string, data?: object, tags?: string[]): void;
  warn(message: string, data?: object, tags?: string[]): void;
  debug(message: string, data?: object, tags?: string[]): void;
  error(message: string, error?: Error, data?: object, tags?: string[]): void;
}
