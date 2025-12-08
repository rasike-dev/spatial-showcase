import { SceneManager } from "../systems/SceneManager.js";
import { MainHallScene } from "../scenes/MainHallScene.js";
import { loadPortfolio, getLoadingHandler } from "./portfolioLoader.js";
import { logger } from "../utils/logger.js";
import { handleApiError } from "../utils/errorHandler.js";
import { endSession } from "../utils/analytics.js";
import { setupIWSDKErrorHandling } from "../utils/IWSDKErrorHandler.js";

/**
 * Start the spatial showcase app
 * @param {Object} world - IWSDK World instance
 * @param {Object} options - Configuration options
 * @param {string} options.portfolioId - Portfolio ID or share token to load
 */
export async function startSpatialShowcase(world, options = {}) {
  // Set up IWSDK error handling first
  setupIWSDKErrorHandling();
  
  const sceneManager = new SceneManager(world);
  
  // Set up loading state handling
  const loadingHandler = getLoadingHandler();
  setupLoadingStateUI(loadingHandler);

  // IMPORTANT: Check URL immediately on load, before any redirects can happen
  // This ensures we capture the hash fragment even if there's an HTTP->HTTPS redirect
  console.log('[startSpatialShowcase] ========== INITIALIZING ==========');
  console.log('[startSpatialShowcase] Initial URL:', window.location.href);
  console.log('[startSpatialShowcase] Initial hash:', window.location.hash);
  
  // Check sessionStorage for hash that might have been stored by HTML inline script
  const storedHash = sessionStorage.getItem('pendingShareToken');
  if (storedHash && !window.location.hash) {
    console.log('[startSpatialShowcase] ⚠️ Hash missing from URL, restoring from sessionStorage:', storedHash);
    window.location.hash = storedHash;
    // Give browser a moment to update
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Check if we should load a portfolio from API
  let portfolioId = options?.portfolioId || getPortfolioIdFromURL();
  
  // Set up hashchange listener for dynamic hash updates
  window.addEventListener('hashchange', () => {
    const newToken = getPortfolioIdFromURL();
    if (newToken && newToken !== portfolioId) {
      console.log('[startSpatialShowcase] Hash changed, loading new portfolio:', newToken);
      portfolioId = newToken;
      loadPortfolioAndStartScene(world, sceneManager, portfolioId);
    }
  }, { once: false });
  
  // Also check after a short delay in case hash is set programmatically or after redirect
  setTimeout(() => {
    const delayedToken = getPortfolioIdFromURL();
    if (delayedToken && !portfolioId) {
      console.log('[startSpatialShowcase] Found token after delay:', delayedToken);
      portfolioId = delayedToken;
      loadPortfolioAndStartScene(world, sceneManager, portfolioId);
    } else if (!portfolioId) {
      console.log('[startSpatialShowcase] No token found after delay, checking URL again:', {
        href: window.location.href,
        hash: window.location.hash
      });
    }
  }, 1000); // Increased delay to account for redirects
  
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
    try {
      sceneManager.loadScene(MainHallScene);
    } catch (error) {
      console.error('[startSpatialShowcase] Error loading default scene:', error);
      logger.error('[startSpatialShowcase] Error loading default scene:', error);
      // Scene should still initialize even if there's an error
    }
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
    
    // Load portfolio data (loadPortfolio now returns scene data directly)
    const sceneData = await loadPortfolio(portfolioId);
    console.log('[startSpatialShowcase] Scene data loaded:', sceneData);
    
    if (!sceneData || !sceneData.portfolio) {
      throw new Error('Portfolio data is invalid or missing');
    }
    
    console.log('[startSpatialShowcase] Scene data has panels:', sceneData.panels?.length || 0);
    console.log('[startSpatialShowcase] Scene data has projects:', sceneData.projects?.length || 0);

    // Store portfolio data globally for scenes to access
    world.portfolioData = sceneData;
    
    // Also store the full portfolio data structure for navigation
    world.portfolioData.portfolio = sceneData.portfolio;
    world.portfolioData.projects = sceneData.projects;

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
  let hash = window.location.hash;
  const params = new URLSearchParams(window.location.search);
  const fullUrl = window.location.href;

  // Check sessionStorage for hash that might have been lost during redirect
  if (!hash && sessionStorage.getItem('pendingShareToken')) {
    hash = sessionStorage.getItem('pendingShareToken');
    console.log('[getPortfolioIdFromURL] Recovered hash from sessionStorage:', hash);
    // Clear it after use
    sessionStorage.removeItem('pendingShareToken');
  }

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

/**
 * Set up loading state UI with proper user feedback
 * @param {PortfolioLoadingHandler} loadingHandler
 */
function setupLoadingStateUI(loadingHandler) {
  // Create loading overlay if it doesn't exist
  let loadingOverlay = document.getElementById('loading-overlay');
  if (!loadingOverlay) {
    loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'loading-overlay';
    loadingOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      display: none;
      justify-content: center;
      align-items: center;
      flex-direction: column;
      z-index: 10000;
      font-family: Arial, sans-serif;
    `;
    
    loadingOverlay.innerHTML = `
      <div style="text-align: center;">
        <div id="loading-spinner" style="
          border: 4px solid #333;
          border-top: 4px solid #6366f1;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        "></div>
        <div id="loading-text" style="font-size: 18px; margin-bottom: 10px;">Loading...</div>
        <div id="loading-progress" style="font-size: 14px; opacity: 0.8;">Initializing...</div>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    
    document.body.appendChild(loadingOverlay);
  }
  
  const loadingText = document.getElementById('loading-text');
  const loadingProgress = document.getElementById('loading-progress');
  
  // Set up loading state callback
  loadingHandler.onLoadingStateChange((state) => {
    switch (state.state) {
      case 'loading':
        loadingOverlay.style.display = 'flex';
        loadingText.textContent = 'Loading Portfolio...';
        loadingProgress.textContent = `${state.progress}% - ${state.operation}`;
        break;
        
      case 'success':
        loadingOverlay.style.display = 'none';
        break;
        
      case 'error':
        loadingText.textContent = 'Loading Failed';
        loadingProgress.textContent = state.operation;
        // Hide after a delay to show error message
        setTimeout(() => {
          loadingOverlay.style.display = 'none';
        }, 3000);
        break;
        
      default:
        loadingOverlay.style.display = 'none';
    }
  });
  
  // Set up error callback
  loadingHandler.onError((errorInfo) => {
    logger.error('[startSpatialShowcase] Portfolio loading error:', errorInfo);
    
    // Show user-friendly error message
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #dc3545;
      color: white;
      padding: 15px;
      border-radius: 5px;
      z-index: 10001;
      max-width: 300px;
      font-family: Arial, sans-serif;
    `;
    
    errorDiv.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px;">Portfolio Loading Error</div>
      <div style="font-size: 14px;">${errorInfo.message}</div>
    `;
    
    document.body.appendChild(errorDiv);
    
    // Auto-remove error after 10 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 10000);
  });
}
