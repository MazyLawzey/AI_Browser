enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

class Logger {
  private isDev = process.env.NODE_ENV === 'development'

  private format(level: LogLevel, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString()
    const dataStr = data ? ` ${JSON.stringify(data)}` : ''
    return `[${timestamp}] [${level}] ${message}${dataStr}`
  }

  debug(message: string, data?: unknown): void {
    if (this.isDev) console.log(this.format(LogLevel.DEBUG, message, data))
  }

  info(message: string, data?: unknown): void {
    console.info(this.format(LogLevel.INFO, message, data))
  }

  warn(message: string, data?: unknown): void {
    console.warn(this.format(LogLevel.WARN, message, data))
  }

  error(message: string, error?: Error | unknown): void {
    const errorData = error instanceof Error ? { message: error.message, stack: error.stack } : error
    console.error(this.format(LogLevel.ERROR, message, errorData))
  }
}

export const logger = new Logger()
