import { logger } from "./logger.js";

/**
 * Wraps an async operation with standardized error handling.
 * @template T
 * @param {() => Promise<T>} operation - async operation to execute
 * @param {{ errorMessage?: string, onError?: (error: Error) => void }} options
 * @returns {Promise<T>}
 */
export async function safeAsync(operation, { errorMessage, onError } = {}) {
  try {
    return await operation();
  } catch (error) {
    if (errorMessage) {
      logger.error(errorMessage, error);
    } else {
      logger.error("[safeAsync] Unhandled error", error);
    }
    if (onError) {
      onError(error);
    }
    throw error;
  }
}

/**
 * Convenience helper for wrapping dynamic imports.
 * @template T
 * @param {() => Promise<T>} loader - dynamic import function
 * @param {string} description - description used in logs
 * @returns {Promise<T>}
 */
export function safeDynamicImport(loader, description) {
  return safeAsync(loader, {
    errorMessage: `[DynamicImport] Failed to load ${description}`
  });
}

/**
 * Logs a standardized error when a scene fails to load.
 * @param {string} sceneName
 * @param {Error} error
 */
export function handleSceneLoadError(sceneName, error) {
  logger.error(`[SceneManager] Failed to load scene "${sceneName}"`, error);
}

