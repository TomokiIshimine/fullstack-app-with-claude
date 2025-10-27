/**
 * Frontend Logging System
 *
 * Provides structured logging with environment-based configuration,
 * sensitive data masking, and performance tracking.
 *
 * Features:
 * - Environment-aware log levels
 * - Automatic timestamp inclusion
 * - Sensitive data masking (password, token, etc.)
 * - Structured metadata support
 * - Production-safe defaults
 */

/**
 * Log levels in order of severity
 */
export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  SILENT: 4,
}

export type LogLevel = 0 | 1 | 2 | 3 | 4

/**
 * Log metadata for structured logging
 */
export interface LogMetadata {
  [key: string]: unknown
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  level: LogLevel
  enableApiLogging: boolean
  environment: 'development' | 'production' | 'test'
}

/**
 * Patterns to mask in log messages
 */
const SENSITIVE_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // password field in objects or query params
  { pattern: /password['"]?\s*[:=]\s*['"]?[^'",}\s]+/gi, replacement: "password='***'" },
  // token field
  { pattern: /token['"]?\s*[:=]\s*['"]?[^'",}\s]+/gi, replacement: "token='***'" },
  // api_key or api-key
  { pattern: /api[_-]?key['"]?\s*[:=]\s*['"]?[^'",}\s]+/gi, replacement: "api_key='***'" },
  // secret field
  { pattern: /secret['"]?\s*[:=]\s*['"]?[^'",}\s]+/gi, replacement: "secret='***'" },
  // authorization header
  { pattern: /authorization:\s*bearer\s+\S+/gi, replacement: 'Authorization: Bearer ***' },
]

/**
 * Get logger configuration from environment variables
 */
function getConfig(): LoggerConfig {
  const env = import.meta.env.MODE || 'development'
  const isDevelopment = env === 'development'
  const isTest = env === 'test'

  // Parse log level from environment
  const envLogLevel = import.meta.env.VITE_LOG_LEVEL?.toUpperCase() || ''
  let level: LogLevel

  if (envLogLevel in LogLevel) {
    level = LogLevel[envLogLevel as keyof typeof LogLevel] as LogLevel
  } else {
    // Default levels by environment
    level = (isDevelopment || isTest ? LogLevel.DEBUG : LogLevel.WARN) as LogLevel
  }

  // API logging (default: enabled in development, disabled in production)
  const enableApiLogging =
    import.meta.env.VITE_ENABLE_API_LOGGING === 'true' ||
    (import.meta.env.VITE_ENABLE_API_LOGGING === undefined && isDevelopment)

  return {
    level,
    enableApiLogging,
    environment: isTest ? 'test' : isDevelopment ? 'development' : 'production',
  }
}

/**
 * Mask sensitive information in log messages
 */
function maskSensitiveData(message: string): string {
  let masked = message

  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    masked = masked.replace(pattern, replacement)
  }

  return masked
}

/**
 * Format log message with metadata
 */
function formatMessage(level: string, message: string, metadata?: LogMetadata): string {
  const timestamp = new Date().toISOString()

  if (metadata && Object.keys(metadata).length > 0) {
    return `[${timestamp}] ${level}: ${message} ${JSON.stringify(metadata)}`
  }

  return `[${timestamp}] ${level}: ${message}`
}

/**
 * Logger class
 */
class Logger {
  private config: LoggerConfig

  constructor() {
    this.config = getConfig()
  }

  /**
   * Update logger configuration (useful for tests)
   */
  public configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  public getConfig(): Readonly<LoggerConfig> {
    return { ...this.config }
  }

  /**
   * Log a debug message
   */
  public debug(message: string, metadata?: LogMetadata): void {
    if (this.config.level <= LogLevel.DEBUG) {
      const masked = maskSensitiveData(message)
      const formatted = formatMessage('DEBUG', masked, metadata)
      console.debug(formatted)
    }
  }

  /**
   * Log an info message
   */
  public info(message: string, metadata?: LogMetadata): void {
    if (this.config.level <= LogLevel.INFO) {
      const masked = maskSensitiveData(message)
      const formatted = formatMessage('INFO', masked, metadata)
      console.info(formatted)
    }
  }

  /**
   * Log a warning message
   */
  public warn(message: string, metadata?: LogMetadata): void {
    if (this.config.level <= LogLevel.WARN) {
      const masked = maskSensitiveData(message)
      const formatted = formatMessage('WARN', masked, metadata)
      console.warn(formatted)
    }
  }

  /**
   * Log an error message
   */
  public error(message: string, error?: Error | unknown, metadata?: LogMetadata): void {
    if (this.config.level <= LogLevel.ERROR) {
      const masked = maskSensitiveData(message)
      const formatted = formatMessage('ERROR', masked, metadata)

      if (error instanceof Error) {
        console.error(formatted, error)
      } else if (error) {
        console.error(formatted, { error })
      } else {
        console.error(formatted)
      }
    }
  }

  /**
   * Check if API logging is enabled
   */
  public isApiLoggingEnabled(): boolean {
    return this.config.enableApiLogging
  }

  /**
   * Log API request
   */
  public logApiRequest(method: string, url: string, metadata?: LogMetadata): void {
    if (this.isApiLoggingEnabled()) {
      this.debug(`API Request: ${method} ${url}`, metadata)
    }
  }

  /**
   * Log API response
   */
  public logApiResponse(
    method: string,
    url: string,
    status: number,
    duration: number,
    metadata?: LogMetadata
  ): void {
    if (this.isApiLoggingEnabled()) {
      const level = status >= 400 ? 'warn' : 'debug'
      const message = `API Response: ${method} ${url} - ${status} (${duration.toFixed(2)}ms)`
      this[level](message, metadata)
    }
  }

  /**
   * Log API error
   */
  public logApiError(
    method: string,
    url: string,
    error: Error | unknown,
    metadata?: LogMetadata
  ): void {
    if (this.isApiLoggingEnabled()) {
      const message = `API Error: ${method} ${url}`
      this.error(message, error, metadata)
    }
  }

  /**
   * Measure execution time of a function
   */
  public async measureAsync<T>(
    label: string,
    fn: () => Promise<T>,
    metadata?: LogMetadata
  ): Promise<T> {
    const start = performance.now()

    try {
      const result = await fn()
      const duration = performance.now() - start
      this.debug(`${label} completed in ${duration.toFixed(2)}ms`, metadata)
      return result
    } catch (error) {
      const duration = performance.now() - start
      this.error(`${label} failed after ${duration.toFixed(2)}ms`, error, metadata)
      throw error
    }
  }

  /**
   * Measure execution time of a synchronous function
   */
  public measure<T>(label: string, fn: () => T, metadata?: LogMetadata): T {
    const start = performance.now()

    try {
      const result = fn()
      const duration = performance.now() - start
      this.debug(`${label} completed in ${duration.toFixed(2)}ms`, metadata)
      return result
    } catch (error) {
      const duration = performance.now() - start
      this.error(`${label} failed after ${duration.toFixed(2)}ms`, error, metadata)
      throw error
    }
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger()

/**
 * Export logger as default for convenience
 */
export default logger
