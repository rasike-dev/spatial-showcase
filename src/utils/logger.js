/**
 * Centralized logging utility for the spatial showcase application.
 * Provides structured logging with configurable log levels and automatic
 * filtering in production builds.
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

/**
 * Logger class for structured application logging
 */
class Logger {
  /**
   * Creates a new Logger instance
   * @param {number} level - Minimum log level to display (default: INFO)
   * @param {boolean} enabled - Whether logging is enabled (default: true in dev)
   */
  constructor(level = LOG_LEVELS.INFO, enabled = true) {
    this.level = level;
    this.enabled = enabled;
  }

  /**
   * Logs a debug message (only in development)
   * @param {...any} args - Arguments to log
   */
  debug(...args) {
    if (this.enabled && this.level <= LOG_LEVELS.DEBUG) {
      console.debug("[DEBUG]", ...args);
    }
  }

  /**
   * Logs an info message
   * @param {...any} args - Arguments to log
   */
  info(...args) {
    if (this.enabled && this.level <= LOG_LEVELS.INFO) {
      console.log("[INFO]", ...args);
    }
  }

  /**
   * Logs a warning message
   * @param {...any} args - Arguments to log
   */
  warn(...args) {
    if (this.enabled && this.level <= LOG_LEVELS.WARN) {
      console.warn("[WARN]", ...args);
    }
  }

  /**
   * Logs an error message
   * @param {...any} args - Arguments to log
   */
  error(...args) {
    if (this.enabled && this.level <= LOG_LEVELS.ERROR) {
      console.error("[ERROR]", ...args);
    }
  }
}

// Create singleton logger instance
// In development: show DEBUG and above
// In production: show INFO and above (no debug logs)
const isDevelopment = import.meta.env.DEV;
const logLevel = isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;

export const logger = new Logger(logLevel, true);

// Export LOG_LEVELS for external configuration if needed
export { LOG_LEVELS };
