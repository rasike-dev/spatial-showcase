import { logger } from "./logger.js";
import { trackEvent } from "./api.js";

/**
 * Handles portfolio loading with proper error handling, loading states, and user feedback
 */
export class PortfolioLoadingHandler {
  constructor() {
    this.loadingState = 'idle'; // idle, loading, success, error
    this.loadingProgress = 0;
    this.currentOperation = '';
    this.loadingCallbacks = new Set();
    this.errorCallbacks = new Set();
  }

  /**
   * Add callback for loading state changes
   */
  onLoadingStateChange(callback) {
    this.loadingCallbacks.add(callback);
    return () => this.loadingCallbacks.delete(callback);
  }

  /**
   * Add callback for error handling
   */
  onError(callback) {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  /**
   * Update loading state and notify callbacks
   */
  updateLoadingState(state, progress = 0, operation = '') {
    this.loadingState = state;
    this.loadingProgress = progress;
    this.currentOperation = operation;

    // Notify all loading callbacks
    for (const callback of this.loadingCallbacks) {
      try {
        callback({
          state: this.loadingState,
          progress: this.loadingProgress,
          operation: this.currentOperation
        });
      } catch (error) {
        logger.error('[PortfolioLoadingHandler] Error in loading callback:', error);
      }
    }

    logger.info(`[PortfolioLoadingHandler] State: ${state}, Progress: ${progress}%, Operation: ${operation}`);
  }

  /**
   * Handle and notify errors
   */
  handleError(error, context = '') {
    logger.error(`[PortfolioLoadingHandler] Error in ${context}:`, error);
    
    this.updateLoadingState('error', 0, `Error: ${context}`);

    // Notify error callbacks
    for (const callback of this.errorCallbacks) {
      try {
        callback({
          error,
          context,
          message: this._getUserFriendlyErrorMessage(error, context)
        });
      } catch (callbackError) {
        logger.error('[PortfolioLoadingHandler] Error in error callback:', callbackError);
      }
    }
  }

  /**
   * Get user-friendly error message
   * @private
   */
  _getUserFriendlyErrorMessage(error, context) {
    const baseMessage = 'Portfolio loading failed';
    
    if (error.message.includes('Portfolio not found')) {
      return 'Portfolio not found. Please check the share link and try again.';
    }
    
    if (error.message.includes('Network')) {
      return 'Network error. Please check your internet connection and try again.';
    }
    
    if (error.message.includes('fetch')) {
      return 'Failed to connect to server. Please try again later.';
    }
    
    if (context.includes('media')) {
      return 'Failed to load media files. Some content may not display properly.';
    }
    
    if (context.includes('projects')) {
      return 'Failed to load project data. Portfolio may appear incomplete.';
    }
    
    return `${baseMessage}: ${error.message}`;
  }

  /**
   * Load portfolio with comprehensive error handling and progress tracking
   */
  async loadPortfolioWithHandling(portfolioLoader, portfolioIdOrToken) {
    try {
      this.updateLoadingState('loading', 0, 'Starting portfolio load');
      
      const startTime = Date.now();
      
      // Step 1: Load portfolio basic data
      this.updateLoadingState('loading', 10, 'Loading portfolio information');
      const result = await this._withTimeout(
        portfolioLoader.loadPortfolio(portfolioIdOrToken),
        15000, // 15 second timeout
        'Portfolio loading timeout'
      );
      
      // Step 2: Validate loaded data
      this.updateLoadingState('loading', 70, 'Validating portfolio data');
      await this._validatePortfolioData(result);
      
      // Step 3: Convert to scene data
      this.updateLoadingState('loading', 85, 'Preparing VR scene data');
      // portfolioToSceneData is now handled internally by loadPortfolio
      const sceneData = result;
      
      // Step 4: Final validation
      this.updateLoadingState('loading', 95, 'Final validation');
      await this._validateSceneData(sceneData);
      
      const duration = Date.now() - startTime;
      this.updateLoadingState('success', 100, `Portfolio loaded successfully in ${duration}ms`);
      
      // Track successful load
      if (result.portfolio?.id) {
        try {
          await trackEvent(result.portfolio.id, 'portfolio_load_success', {
            duration,
            panels: sceneData.panels?.length || 0,
            projects: sceneData.projects?.length || 0
          });
        } catch (trackingError) {
          logger.warn('[PortfolioLoadingHandler] Failed to track success event:', trackingError);
        }
      }
      
      logger.info(`[PortfolioLoadingHandler] Portfolio loaded successfully in ${duration}ms`);
      return sceneData;
      
    } catch (error) {
      this._handleError(error, 'portfolio loading');
      
      // Track failed load
      try {
        await trackEvent(null, 'portfolio_load_error', {
          error: error.message,
          token: portfolioIdOrToken
        });
      } catch (trackingError) {
        logger.warn('[PortfolioLoadingHandler] Failed to track error event:', trackingError);
      }
      
      throw error;
    }
  }

  /**
   * Add timeout to promise
   * @private
   */
  _withTimeout(promise, timeoutMs, timeoutMessage) {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
      })
    ]);
  }

  /**
   * Validate portfolio data structure
   * @private
   */
  async _validatePortfolioData(data) {
    if (!data) {
      throw new Error('No portfolio data received');
    }
    
    if (!data.portfolio) {
      throw new Error('Portfolio information missing');
    }
    
    if (!data.projects || !Array.isArray(data.projects)) {
      throw new Error('Project data missing or invalid');
    }
    
    // Check if main hall project exists and has media
    const mainHallProject = data.projects.find(p => (p.order_index ?? 0) === 0) || data.projects[0];
    if (!mainHallProject) {
      throw new Error('No main hall project found');
    }
    
    if (!mainHallProject.media || mainHallProject.media.length === 0) {
      logger.warn('[PortfolioLoadingHandler] Main hall project has no media items');
    }
    
    // Validate media URLs
    for (const project of data.projects) {
      if (project.media) {
        for (const media of project.media) {
          if (!media.url) {
            logger.warn(`[PortfolioLoadingHandler] Media item missing URL in project ${project.id}`);
          }
        }
      }
    }
    
    logger.info('[PortfolioLoadingHandler] Portfolio data validation passed');
  }

  /**
   * Validate scene data structure
   * @private
   */
  async _validateSceneData(sceneData) {
    if (!sceneData) {
      throw new Error('No scene data generated');
    }
    
    if (!sceneData.panels || !Array.isArray(sceneData.panels)) {
      throw new Error('Panel data missing or invalid');
    }
    
    if (sceneData.panels.length === 0) {
      logger.warn('[PortfolioLoadingHandler] No panels generated - portfolio may appear empty');
    }
    
    // Validate panel structure
    for (const panel of sceneData.panels) {
      if (!panel.id) {
        throw new Error('Panel missing required ID');
      }
      
      if (!panel.title && !panel.name) {
        logger.warn(`[PortfolioLoadingHandler] Panel ${panel.id} missing title/name`);
      }
      
      if (!panel.image && !panel.video) {
        logger.warn(`[PortfolioLoadingHandler] Panel ${panel.id} has no media content`);
      }
    }
    
    logger.info(`[PortfolioLoadingHandler] Scene data validation passed - ${sceneData.panels.length} panels`);
  }

  /**
   * Get current loading state
   */
  getLoadingState() {
    return {
      state: this.loadingState,
      progress: this.loadingProgress,
      operation: this.currentOperation
    };
  }

  /**
   * Reset loading handler state
   */
  reset() {
    this.loadingState = 'idle';
    this.loadingProgress = 0;
    this.currentOperation = '';
    logger.info('[PortfolioLoadingHandler] State reset');
  }
}