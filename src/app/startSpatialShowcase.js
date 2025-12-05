import { SceneManager } from "../systems/SceneManager.js";
import { MainHallScene } from "../scenes/MainHallScene.js";
import { loadPortfolio, portfolioToSceneData } from "./portfolioLoader.js";
import { logger } from "../utils/logger.js";
import { handleApiError } from "../utils/errorHandler.js";
import { endSession } from "../utils/analytics.js";

/**
 * Start the spatial showcase app
 * @param {Object} world - IWSDK World instance
 * @param {Object} options - Configuration options
 * @param {string} options.portfolioId - Portfolio ID or share token to load
 */
export async function startSpatialShowcase(world, options = {}) {
  const sceneManager = new SceneManager(world);

  // Check if we should load a portfolio from API
  const portfolioId = options?.portfolioId || getPortfolioIdFromURL();

  if (portfolioId) {
    try {
      logger.info('[startSpatialShowcase] Loading portfolio from API:', portfolioId);
      
      // Load portfolio data
      const portfolioData = await loadPortfolio(portfolioId);
      const sceneData = portfolioToSceneData(portfolioData);

      // Store portfolio data globally for scenes to access
      world.portfolioData = sceneData;

      logger.info('[startSpatialShowcase] Portfolio loaded, starting scene with data:', sceneData);

      // Load Main Hall with portfolio data
      sceneManager.loadScene(MainHallScene, { portfolioData: sceneData });
    } catch (error) {
      logger.error('[startSpatialShowcase] Failed to load portfolio, using default:', error);
      handleApiError(error, 'loading portfolio');
      // Fallback to default scene
      sceneManager.loadScene(MainHallScene);
    }
  } else {
    // No portfolio specified, use default content
    logger.info('[startSpatialShowcase] No portfolio ID, using default content');
    sceneManager.loadScene(MainHallScene);
  }
}

/**
 * Extract portfolio ID or token from URL
 * Supports:
 * - /view/:token (share link)
 * - ?portfolio=:id (query param)
 */
function getPortfolioIdFromURL() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);

  // Check for /view/:token pattern
  const viewMatch = path.match(/\/view\/([^/]+)/);
  if (viewMatch) {
    return viewMatch[1];
  }

  // Check for query parameter
  const portfolioParam = params.get('portfolio');
  if (portfolioParam) {
    return portfolioParam;
  }

  return null;
}
