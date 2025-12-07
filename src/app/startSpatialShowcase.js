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
  let portfolioId = options?.portfolioId || getPortfolioIdFromURL();
  
  // Set up hashchange listener for dynamic hash updates
  if (!portfolioId) {
    console.log('[startSpatialShowcase] No token found initially, setting up hashchange listener...');
    window.addEventListener('hashchange', () => {
      const newToken = getPortfolioIdFromURL();
      if (newToken && newToken !== portfolioId) {
        console.log('[startSpatialShowcase] Hash changed, loading new portfolio:', newToken);
        portfolioId = newToken;
        loadPortfolioAndStartScene(world, sceneManager, portfolioId);
      }
    }, { once: false });
    
    // Also check after a short delay in case hash is set programmatically
    setTimeout(() => {
      const delayedToken = getPortfolioIdFromURL();
      if (delayedToken && !portfolioId) {
        console.log('[startSpatialShowcase] Found token after delay:', delayedToken);
        portfolioId = delayedToken;
        loadPortfolioAndStartScene(world, sceneManager, portfolioId);
      }
    }, 500);
  }
  
  if (portfolioId) {
    console.log('[startSpatialShowcase] Portfolio ID found, loading:', portfolioId);
    await loadPortfolioAndStartScene(world, sceneManager, portfolioId);
  } else {
    // No portfolio specified, use default content
    console.log('[startSpatialShowcase] No portfolio ID found in URL');
    console.log('[startSpatialShowcase] URL details:', {
      href: window.location.href,
      hash: window.location.hash,
      search: window.location.search,
      pathname: window.location.pathname
    });
    logger.info('[startSpatialShowcase] No portfolio ID, using default content');
    sceneManager.loadScene(MainHallScene);
  }
}

/**
 * Helper function to load portfolio and start scene
 */
async function loadPortfolioAndStartScene(world, sceneManager, portfolioId) {
  try {
    logger.info('[startSpatialShowcase] Loading portfolio from API:', portfolioId);
    console.log('[startSpatialShowcase] Portfolio ID/Token:', portfolioId);
    console.log('[startSpatialShowcase] Current URL:', window.location.href);
    
    // Load portfolio data
    const portfolioData = await loadPortfolio(portfolioId);
    console.log('[startSpatialShowcase] Portfolio data loaded:', portfolioData);
    
    if (!portfolioData || !portfolioData.portfolio) {
      throw new Error('Portfolio data is invalid or missing');
    }
    
    const sceneData = portfolioToSceneData(portfolioData);
    console.log('[startSpatialShowcase] Scene data converted:', sceneData);
    console.log('[startSpatialShowcase] Scene data has panels:', sceneData.panels?.length || 0);
    console.log('[startSpatialShowcase] Scene data has projects:', sceneData.projects?.length || 0);

    // Store portfolio data globally for scenes to access
    world.portfolioData = sceneData;
    
    // Also store the full portfolio data structure for navigation
    world.portfolioData.portfolio = portfolioData.portfolio;
    world.portfolioData.projects = portfolioData.projects;

    logger.info('[startSpatialShowcase] Portfolio loaded, starting scene with data:', sceneData);

    // Load Main Hall with portfolio data
    sceneManager.loadScene(MainHallScene, { portfolioData: sceneData });
    console.log('[startSpatialShowcase] Scene loaded with portfolio data');
  } catch (error) {
    console.error('[startSpatialShowcase] ERROR loading portfolio:', error);
    console.error('[startSpatialShowcase] Error details:', {
      message: error.message,
      stack: error.stack,
      response: error.response,
      status: error.response?.status,
      data: error.response?.data
    });
    logger.error('[startSpatialShowcase] Failed to load portfolio, using default:', error);
    handleApiError(error, 'loading portfolio');
    // Fallback to default scene
    console.log('[startSpatialShowcase] Falling back to default scene');
    sceneManager.loadScene(MainHallScene);
  }
}


/**
 * Extract portfolio ID or token from URL
 * Supports (in priority order):
 * - #token=:token (share link - primary method, hash fragment)
 * - ?token=:token (query parameter - fallback)
 * - ?portfolio=:id (query param for direct portfolio access)
 * - /view/:token (legacy path-based - for backwards compatibility)
 */
function getPortfolioIdFromURL() {
  const path = window.location.pathname;
  const hash = window.location.hash;
  const params = new URLSearchParams(window.location.search);
  const fullUrl = window.location.href;

  console.log('[getPortfolioIdFromURL] Parsing URL:', {
    pathname: path,
    hash: hash,
    search: window.location.search,
    fullUrl: fullUrl,
  });

  logger.info('[getPortfolioIdFromURL] Parsing URL:', {
    pathname: path,
    hash: hash,
    search: window.location.search,
    fullUrl: fullUrl,
  });

  // Primary method: Check for token in hash fragment (e.g., #token=ABC123)
  if (hash) {
    console.log('[getPortfolioIdFromURL] Hash found:', hash);
    
    // Try URLSearchParams first
    try {
      const hashParams = new URLSearchParams(hash.substring(1)); // Remove #
      const tokenFromHash = hashParams.get('token');
      if (tokenFromHash) {
        console.log('[getPortfolioIdFromURL] ✅ Found token in hash (URLSearchParams):', tokenFromHash);
        logger.info('[getPortfolioIdFromURL] Found token in hash:', tokenFromHash);
        return tokenFromHash;
      }
    } catch (e) {
      console.log('[getPortfolioIdFromURL] URLSearchParams failed, trying manual parse:', e);
    }
    
    // Fallback: Manual parsing for hash like #token=ABC123
    const hashMatch = hash.match(/[#&]token=([^&]+)/);
    if (hashMatch && hashMatch[1]) {
      const tokenFromHash = hashMatch[1];
      console.log('[getPortfolioIdFromURL] ✅ Found token in hash (manual parse):', tokenFromHash);
      logger.info('[getPortfolioIdFromURL] Found token in hash (manual):', tokenFromHash);
      return tokenFromHash;
    }
    
    // Also check if hash itself is the token (e.g., #ABC123)
    const hashOnly = hash.substring(1); // Remove #
    if (hashOnly && hashOnly.length > 10 && !hashOnly.includes('=') && !hashOnly.includes('&')) {
      // Looks like a token (long string without special chars)
      console.log('[getPortfolioIdFromURL] ✅ Hash itself might be token:', hashOnly);
      logger.info('[getPortfolioIdFromURL] Hash as token:', hashOnly);
      return hashOnly;
    }
  }

  // Fallback: Check for token query parameter
  const tokenParam = params.get('token');
  if (tokenParam) {
    console.log('[getPortfolioIdFromURL] ✅ Found token in query:', tokenParam);
    logger.info('[getPortfolioIdFromURL] Found token in query:', tokenParam);
    return tokenParam;
  }

  // Check for portfolio query parameter
  const portfolioParam = params.get('portfolio');
  if (portfolioParam) {
    console.log('[getPortfolioIdFromURL] ✅ Found portfolio in query:', portfolioParam);
    logger.info('[getPortfolioIdFromURL] Found portfolio in query:', portfolioParam);
    return portfolioParam;
  }

  // Legacy: Check for /view/:token pattern (for backwards compatibility)
  const viewMatch = path.match(/\/view\/([^/]+)/);
  if (viewMatch) {
    const token = viewMatch[1];
    console.log('[getPortfolioIdFromURL] ✅ Found token in path (legacy):', token);
    logger.info('[getPortfolioIdFromURL] Found token in path (legacy):', token);
    return token;
  }

  console.log('[getPortfolioIdFromURL] ❌ No portfolio ID/token found in URL');
  logger.info('[getPortfolioIdFromURL] No portfolio ID/token found in URL');
  return null;
}
