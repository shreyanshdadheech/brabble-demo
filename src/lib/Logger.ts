export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export class Logger {
  private static instance: Logger;

  private logLevel: LogLevel = LogLevel.INFO;
  private enabled: boolean = process.env.NODE_ENV !== "production";

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public error(message: string, ...args: any[]): void {
    if (this.enabled && this.logLevel >= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  public warn(message: string, ...args: any[]): void {
    if (this.enabled && this.logLevel >= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  public info(message: string, ...args: any[]): void {
    if (this.enabled && this.logLevel >= LogLevel.INFO) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  public debug(message: any, ...args: any[]): void {
    if (this.enabled && this.logLevel >= LogLevel.DEBUG) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
}
