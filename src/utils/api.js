/**
 * API client for connecting VR app to backend
 */

import { handleApiError } from './errorHandler.js';
import { logger } from './logger.js';
import { getCache, setCache } from './cache.js';

// Determine API URL based on environment
// For development: Use HTTPS for localhost to avoid mixed content warnings
// For production: Use proper HTTPS URL
function getApiBaseUrl() {
  // Check if we have a configured API URL
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Auto-detect based on current page protocol
  const isSecure = window.location.protocol === 'https:';
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  if (isLocalhost) {
    // For localhost development, always use HTTP since backend doesn't support HTTPS
    // This will cause mixed content warnings but allows functionality to work
    return 'http://localhost:3000/api';
  }
  
  // For production, use the deployed Vercel API URL
  return 'https://spatial-showcase-api.vercel.app/api';
}

const API_BASE_URL = getApiBaseUrl();
console.log('[API] Using API base URL:', API_BASE_URL);

/**
 * Fetch portfolio by ID or share token (with caching)
 */
export async function getPortfolio(idOrToken, useCache = true) {
  const cacheKey = `portfolio:${idOrToken}`;
  
  // Check cache first
  if (useCache) {
    const cached = getCache(cacheKey);
    if (cached) {
      logger.info('[API] Portfolio cache hit:', idOrToken);
      return cached;
    }
  }

  // Encode the token to handle special characters in URLs
  const encodedToken = encodeURIComponent(idOrToken);
  const url = `${API_BASE_URL}/share/${encodedToken}`;
  logger.info('[API] Fetching portfolio from:', url);
  console.log('[API] ========== FETCHING PORTFOLIO ==========');
  console.log('[API] Original Token/ID:', idOrToken);
  console.log('[API] Encoded Token/ID:', encodedToken);
  console.log('[API] Full URL:', url);

  try {
    console.log('[API] Making request to:', url);
    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Add credentials for CORS if needed
      credentials: 'omit',
    });

    console.log('[API] Response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
    });
    logger.info('[API] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Error response body:', errorText);
      logger.error('[API] Error response:', errorText);
      throw new Error(`Failed to fetch portfolio: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const duration = Date.now() - startTime;
    console.log('[API] ✅ Response received in', duration, 'ms');
    console.log('[API] Response data:', data);
    logger.info('[API] Portfolio data received:', data);
    
    const portfolio = data.portfolio;
    
    if (!portfolio) {
      console.error('[API] ❌ Portfolio data not found in response. Response keys:', Object.keys(data));
      throw new Error('Portfolio data not found in response');
    }
    
    console.log('[API] ✅ Portfolio loaded successfully:', {
      id: portfolio.id,
      title: portfolio.title
    });
    
    // Cache the result
    if (useCache && portfolio) {
      setCache(cacheKey, portfolio, 10 * 60 * 1000); // 10 minutes for portfolios
    }
    
    return portfolio;
  } catch (error) {
    logger.error('[API] Error fetching portfolio:', error);
    logger.error('[API] Error details:', {
      message: error.message,
      stack: error.stack,
      url: url,
    });
    handleApiError(error, 'fetching portfolio');
    throw error;
  }
}

/**
 * Fetch projects for a portfolio (with caching)
 */
export async function getProjects(portfolioId, useCache = true) {
  const cacheKey = `projects:${portfolioId}`;
  
  if (useCache) {
    const cached = getCache(cacheKey);
    if (cached) {
      logger.info('[API] Projects cache hit:', portfolioId);
      return cached;
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/projects/portfolio/${portfolioId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    const data = await response.json();
    const projects = data.projects || [];
    
    if (useCache) {
      setCache(cacheKey, projects, 5 * 60 * 1000); // 5 minutes for projects
    }
    
    return projects;
  } catch (error) {
    logger.error('[API] Error fetching projects:', error);
    return [];
  }
}

/**
 * Fetch media for a project or portfolio
 */
export async function getMedia(projectId = null, portfolioId = null) {
  try {
    const params = new URLSearchParams();
    if (projectId) params.append('project_id', projectId);
    if (portfolioId) params.append('portfolio_id', portfolioId);
    
    const url = `${API_BASE_URL}/media?${params.toString()}`;
    console.log(`[API] Fetching media from: ${url}`);
    logger.info(`[API] Fetching media: projectId=${projectId}, portfolioId=${portfolioId}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] Error response body (media):`, errorText);
      throw new Error(`Failed to fetch media: ${response.statusText}`);
    }
    const data = await response.json();
    const media = data.media || [];
    console.log(`[API] Received ${media.length} media items:`, media);
    logger.info(`[API] Received ${media.length} media items`);
    return media;
  } catch (error) {
    console.error('[API] Error fetching media:', error);
    logger.error('[API] Error fetching media:', error);
    return [];
  }
}

/**
 * Track analytics event
 */
export async function trackEvent(portfolioId, eventType, eventData = {}) {
  try {
    await fetch(`${API_BASE_URL}/analytics/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        portfolio_id: portfolioId,
        event_type: eventType,
        event_data: eventData,
        device_type: 'vr',
      }),
    });
  } catch (error) {
    console.error('[API] Error tracking event:', error);
    // Don't throw - analytics failures shouldn't break the app
  }
}

/**
 * Get full media URL with proper protocol handling
 * 
 * Handles three types of URLs:
 * 1. Full URLs (Blob CDN, external) - returns as-is
 * 2. Relative paths starting with /uploads/ - constructs API URL
 * 3. Other relative paths - constructs API URL
 */
export function getMediaUrl(url) {
  if (!url) return null;
  
  // If URL is already a full URL (http/https), return as-is
  // This includes:
  // - Vercel Blob URLs (https://xxx.public.blob.vercel-storage.com/...)
  // - External CDN URLs
  // - Any other full URLs
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // For relative paths, construct full URL using API base URL
  const apiBaseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 
                     (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                       ? 'http://localhost:3000'
                       : 'https://spatial-showcase-api.vercel.app');
  
  if (url.startsWith('/uploads/')) {
    // Local file storage path - serve via API
    const mediaUrl = `${apiBaseUrl}/api/media${url}`;
    console.log(`[API] Generated media URL: ${mediaUrl} from ${url}`);
    return mediaUrl;
  }
  
  // Other relative paths
  const mediaUrl = `${apiBaseUrl}${url}`;
  console.log(`[API] Generated media URL: ${mediaUrl} from ${url}`);
  return mediaUrl;
}

