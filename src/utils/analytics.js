import { trackEvent } from './api.js';
import { logger } from './logger.js';

/**
 * Enhanced analytics tracking
 */

let sessionStartTime = null;
let lastInteractionTime = null;
let interactionCount = 0;

/**
 * Start tracking session
 */
export function startSession(portfolioId) {
  sessionStartTime = Date.now();
  lastInteractionTime = sessionStartTime;
  interactionCount = 0;
  
  trackEvent(portfolioId, 'session_start', {
    timestamp: new Date().toISOString(),
  });
  
  logger.info('[Analytics] Session started for portfolio:', portfolioId);
}

/**
 * Track interaction
 */
export function trackInteraction(portfolioId, interactionType, data = {}) {
  interactionCount++;
  lastInteractionTime = Date.now();
  
  trackEvent(portfolioId, 'interaction', {
    type: interactionType,
    count: interactionCount,
    ...data,
    timestamp: new Date().toISOString(),
  });
  
  logger.info('[Analytics] Interaction tracked:', { portfolioId, interactionType });
}

/**
 * Track time spent and end session
 */
export function endSession(portfolioId) {
  if (!sessionStartTime) return;
  
  const timeSpent = (Date.now() - sessionStartTime) / 1000; // in seconds
  
  trackEvent(portfolioId, 'time_spent', {
    duration: timeSpent,
    interactions: interactionCount,
    timestamp: new Date().toISOString(),
  });
  
  trackEvent(portfolioId, 'session_end', {
    duration: timeSpent,
    timestamp: new Date().toISOString(),
  });
  
  logger.info('[Analytics] Session ended:', { portfolioId, timeSpent, interactions: interactionCount });
  
  // Reset
  sessionStartTime = null;
  lastInteractionTime = null;
  interactionCount = 0;
}

/**
 * Track panel view
 */
export function trackPanelView(portfolioId, panelId, panelTitle) {
  trackInteraction(portfolioId, 'panel_view', {
    panel_id: panelId,
    panel_title: panelTitle,
  });
}

/**
 * Track media interaction
 */
export function trackMediaInteraction(portfolioId, mediaId, mediaType, action) {
  trackInteraction(portfolioId, 'media_interaction', {
    media_id: mediaId,
    media_type: mediaType,
    action, // 'view', 'play', 'download'
  });
}

// Track page visibility changes
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && sessionStartTime) {
      // Page hidden - could end session or pause tracking
      logger.info('[Analytics] Page hidden');
    } else if (!document.hidden && sessionStartTime) {
      // Page visible again
      logger.info('[Analytics] Page visible');
    }
  });

  // Track before page unload
  window.addEventListener('beforeunload', () => {
    // Note: This might not always fire, but we try
    if (sessionStartTime && window.portfolioId) {
      endSession(window.portfolioId);
    }
  });
}

