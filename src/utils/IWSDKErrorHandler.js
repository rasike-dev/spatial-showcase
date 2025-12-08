/**
 * IWSDK Error Handler
 * 
 * Handles the WebGL renderer timing error that occurs when PanelUI
 * components are processed before their materials are fully initialized
 */

import { logger } from './logger.js';

/**
 * Set up global error handling for IWSDK WebGL timing issues
 */
export function setupIWSDKErrorHandling() {
  // RE-ENABLE error suppression for known IWSDK 0.2.0 WebGL renderer bug
  logger.info('[IWSDKErrorHandler] Error suppression ENABLED for known IWSDK WebGL bug');
  
  const originalError = console.error;
  console.error = function(...args) {
    const errorMessage = args.join(' ');
    
    // Suppress the specific IWSDK WebGL renderer error that's a known bug
    if (errorMessage.includes('Cannot read properties of undefined (reading \'test\')') ||
        (errorMessage.includes('projectObject') && errorMessage.includes('@iwsdk'))) {
      
      // Only log once every 5 seconds to avoid spam
      if (!window._iwsdkErrorLastLogged || Date.now() - window._iwsdkErrorLastLogged > 5000) {
        logger.warn('[IWSDKErrorHandler] Suppressed known IWSDK 0.2.0 WebGL renderer bug');
        window._iwsdkErrorLastLogged = Date.now();
      }
      return; // Suppress this specific error
    }
    
    // For all other errors, use the original console.error
    originalError.apply(console, args);
  };

  // Also catch uncaught errors and suppress known IWSDK bug
  // Use capture phase to catch errors before other handlers
  window.addEventListener('error', (event) => {
    const error = event.error;
    const message = error?.message || event.message;
    
    if (message && (
        message.includes('Cannot read properties of undefined (reading \'test\')') ||
        (message.includes('projectObject') && message.includes('@iwsdk'))
    )) {
      // Suppress this specific error
      if (!window._iwsdkErrorLastLogged || Date.now() - window._iwsdkErrorLastLogged > 5000) {
        logger.warn('[IWSDKErrorHandler] Suppressed uncaught IWSDK WebGL renderer error');
        window._iwsdkErrorLastLogged = Date.now();
      }
      // Mark as suppressed so other handlers know
      window._iwsdkErrorSuppressed = true;
      event.preventDefault(); // Prevent the error from propagating
      event.stopPropagation(); // Stop propagation to other handlers
      return false;
    }
  }, true); // Use capture phase to intercept before other handlers

  // Catch unhandled promise rejections and suppress known IWSDK bug
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason?.message || reason;
    
    if (message && typeof message === 'string' && (
        message.includes('Cannot read properties of undefined (reading \'test\')') ||
        (message.includes('projectObject') && message.includes('@iwsdk'))
    )) {
      // Suppress this specific error
      if (!window._iwsdkErrorLastLogged || Date.now() - window._iwsdkErrorLastLogged > 5000) {
        logger.warn('[IWSDKErrorHandler] Suppressed unhandled IWSDK promise rejection');
        window._iwsdkErrorLastLogged = Date.now();
      }
      event.preventDefault();
    }
  });

  logger.info('[IWSDKErrorHandler] IWSDK error handling initialized');
}

/**
 * Temporarily suppress WebGL renderer errors during panel creation
 */
export function withErrorSuppression(fn) {
  return async (...args) => {
    const originalConsoleError = console.error;
    const suppressedErrors = [];
    
    // Temporarily override console.error
    console.error = function(...errorArgs) {
      const errorMessage = errorArgs.join(' ');
      
      if (errorMessage.includes('Cannot read properties of undefined (reading \'test\')') ||
          errorMessage.includes('projectObject') ||
          errorMessage.includes('WebGLRenderer.render')) {
        suppressedErrors.push(errorMessage);
        return; // Suppress this error
      }
      
      // For other errors, use original console.error
      originalConsoleError.apply(console, errorArgs);
    };
    
    try {
      const result = await fn(...args);
      
      if (suppressedErrors.length > 0) {
        logger.debug(`[IWSDKErrorHandler] Suppressed ${suppressedErrors.length} WebGL renderer errors during operation`);
      }
      
      return result;
    } finally {
      // Restore original console.error
      console.error = originalConsoleError;
    }
  };
}