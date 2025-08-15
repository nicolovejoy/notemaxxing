// Debug logger with different log levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: Date
  level: LogLevel
  message: string
  data?: unknown
  stack?: string
}

class Logger {
  private logs: LogEntry[] = []
  private maxLogs = 100
  private isDevelopment = process.env.NODE_ENV === 'development'

  private log(level: LogLevel, message: string, data?: unknown) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
    }

    // Add stack trace for errors
    if (level === 'error' && data instanceof Error) {
      entry.stack = data.stack
    }

    // Store in memory for debug console
    this.logs.push(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // Console output with styling
    const styles = {
      debug: 'color: gray',
      info: 'color: blue',
      warn: 'color: orange',
      error: 'color: red; font-weight: bold',
    }

    const prefix = `[${level.toUpperCase()}] ${entry.timestamp.toISOString()}`

    if (this.isDevelopment || level === 'error' || level === 'warn') {
      console.log(`%c${prefix} - ${message}`, styles[level], data)
    }
  }

  debug(message: string, data?: unknown) {
    this.log('debug', message, data)
  }

  info(message: string, data?: unknown) {
    this.log('info', message, data)
  }

  warn(message: string, data?: unknown) {
    this.log('warn', message, data)
  }

  error(message: string, error?: unknown) {
    this.log('error', message, error)
  }

  getLogs() {
    return [...this.logs]
  }

  clearLogs() {
    this.logs = []
  }
}

// Singleton instance
export const logger = new Logger()

// Debug helper to log store operations
export function logStoreOperation(operation: string, data?: unknown, error?: unknown) {
  if (error) {
    logger.error(`Store operation failed: ${operation}`, { data, error })
  } else {
    logger.debug(`Store operation: ${operation}`, data)
  }
}

// Debug helper to log API calls
export function logApiCall(endpoint: string, method: string, data?: unknown, error?: unknown) {
  if (error) {
    logger.error(`API call failed: ${method} ${endpoint}`, { data, error })
  } else {
    // Commented out to reduce console noise
    // logger.debug(`API call: ${method} ${endpoint}`, data);
  }
}

// Debug helper to log auth events
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function logAuthEvent(_event: string, _data?: unknown) {
  // Commented out to reduce console noise
  // logger.info(`Auth event: ${_event}`, _data);
}
