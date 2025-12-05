import { logger } from './logger.js';

/**
 * Enhanced error handling for VR app
 */

/**
 * Display error message to user in VR
 */
export function showError(message, details = null) {
  logger.error('[ErrorHandler]', message, details);
  
  // Create error overlay in VR
  const errorOverlay = document.createElement('div');
  errorOverlay.id = 'vr-error-overlay';
  errorOverlay.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 20px;
    border-radius: 10px;
    z-index: 10000;
    max-width: 400px;
    text-align: center;
    font-family: Arial, sans-serif;
  `;
  
  errorOverlay.innerHTML = `
    <h3 style="margin: 0 0 10px 0; color: #ff4444;">Error</h3>
    <p style="margin: 0 0 10px 0;">${message}</p>
    ${details ? `<p style="margin: 0; font-size: 12px; color: #aaa;">${details}</p>` : ''}
    <button 
      onclick="document.getElementById('vr-error-overlay').remove()"
      style="margin-top: 15px; padding: 8px 16px; background: #6366f1; color: white; border: none; border-radius: 5px; cursor: pointer;"
    >
      Close
    </button>
  `;
  
  document.body.appendChild(errorOverlay);
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (errorOverlay.parentNode) {
      errorOverlay.remove();
    }
  }, 10000);
}

/**
 * Handle API errors gracefully
 */
export function handleApiError(error, context = '') {
  let message = 'An error occurred';
  let details = null;

  if (error.message) {
    message = error.message;
  }

  if (error.response) {
    // API error response
    const status = error.response.status;
    const data = error.response.data;

    switch (status) {
      case 404:
        message = 'Portfolio not found';
        details = 'The portfolio you\'re looking for doesn\'t exist or has been removed.';
        break;
      case 403:
        message = 'Access denied';
        details = 'You don\'t have permission to view this portfolio.';
        break;
      case 500:
        message = 'Server error';
        details = 'The server encountered an error. Please try again later.';
        break;
      default:
        message = data?.error || `Error ${status}`;
        details = context ? `Error in ${context}` : null;
    }
  } else if (error.request) {
    // Network error
    message = 'Network error';
    details = 'Unable to connect to the server. Please check your connection.';
  }

  logger.error('[ErrorHandler] API Error:', { message, details, error });
  showError(message, details);
  
  return { message, details };
}
