/**
 * API client for connecting VR app to backend
 */

import { handleApiError } from './errorHandler.js';
import { logger } from './logger.js';
import { getCache, setCache } from './cache.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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

  try {
    const response = await fetch(`${API_BASE_URL}/share/${idOrToken}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch portfolio: ${response.statusText}`);
    }
    const data = await response.json();
    const portfolio = data.portfolio;
    
    // Cache the result
    if (useCache && portfolio) {
      setCache(cacheKey, portfolio, 10 * 60 * 1000); // 10 minutes for portfolios
    }
    
    return portfolio;
  } catch (error) {
    logger.error('[API] Error fetching portfolio:', error);
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
    
    const response = await fetch(`${API_BASE_URL}/media?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch media: ${response.statusText}`);
    }
    const data = await response.json();
    return data.media || [];
  } catch (error) {
    console.error('[API] Error fetching media:', error);
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
 * Get full media URL
 */
export function getMediaUrl(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  // Backend serves media at /api/media/uploads/filename
  const baseUrl = API_BASE_URL.replace('/api', '');
  if (url.startsWith('/uploads/')) {
    return `${baseUrl}/api/media${url}`;
  }
  return `${baseUrl}${url}`;
}

