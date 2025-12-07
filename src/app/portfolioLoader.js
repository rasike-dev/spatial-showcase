import { getPortfolio, getProjects, getMedia, trackEvent, getMediaUrl } from '../utils/api.js';
import { logger } from '../utils/logger.js';
import { clearCache } from '../utils/cache.js';
import { startSession } from '../utils/analytics.js';

/**
 * Loads a portfolio and all its content from the API
 */
export async function loadPortfolio(portfolioIdOrToken) {
  try {
    logger.info('[PortfolioLoader] Loading portfolio:', portfolioIdOrToken);

    // Load portfolio
    const portfolio = await getPortfolio(portfolioIdOrToken);
    if (!portfolio) {
      throw new Error('Portfolio not found');
    }

    logger.info('[PortfolioLoader] Portfolio loaded:', portfolio);

    // Track view
    await trackEvent(portfolio.id, 'view', {
      source: 'vr_app',
      timestamp: new Date().toISOString(),
    });

    // Start analytics session
    startSession(portfolio.id);
    window.portfolioId = portfolio.id; // Store for cleanup

    // Load projects
    const projects = await getProjects(portfolio.id);
    logger.info('[PortfolioLoader] Projects loaded:', projects.length);

    // Load media for each project and portfolio
    const projectsWithMedia = await Promise.all(
      projects.map(async (project) => {
        const media = await getMedia(project.id, null);
        return {
          ...project,
          media: media.map(m => ({
            ...m,
            url: getMediaUrl(m.url),
          })),
        };
      })
    );

    // Load portfolio-level media
    const portfolioMedia = await getMedia(null, portfolio.id);
    const portfolioMediaUrls = portfolioMedia.map(m => ({
      ...m,
      url: getMediaUrl(m.url),
    }));

    // Parse settings if it's a string
    let settings = portfolio.settings;
    if (typeof settings === 'string') {
      try {
        settings = JSON.parse(settings);
      } catch (e) {
        settings = {};
      }
    }

    return {
      portfolio: {
        ...portfolio,
        settings: settings || {},
      },
      projects: projectsWithMedia,
      portfolioMedia: portfolioMediaUrls,
    };
  } catch (error) {
    logger.error('[PortfolioLoader] Error loading portfolio:', error);
    throw error;
  }
}

/**
 * Get project by ID from portfolio data
 */
export function getProjectById(portfolioData, projectId) {
  if (!portfolioData || !portfolioData.projects) {
    return null;
  }
  return portfolioData.projects.find(p => p.id === projectId) || null;
}

/**
 * Converts portfolio data to scene format
 */
export function portfolioToSceneData(portfolioData) {
  const { portfolio, projects, portfolioMedia } = portfolioData;

  // Get template config
  const templateConfig = portfolio.settings?.templateConfig || {};
  const colors = portfolio.settings?.colors || templateConfig.colors || {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    background: '#1e1e2e',
  };

  // Convert projects to panels
  const panels = projects.map((project, index) => {
    const projectMedia = project.media || [];
    const firstImage = projectMedia.find(m => m.type === 'image');
    const firstVideo = projectMedia.find(m => m.type === 'video');

    return {
      id: project.id,
      title: project.title,
      description: project.description,
      image: firstImage?.url || null,
      video: firstVideo?.url || null,
      media: projectMedia,
      order_index: project.order_index || index,
    };
  });

  return {
    portfolio,
    panels,
    projects: projects, // Include full project data for navigation (projects already have media from loadPortfolio)
    portfolioMedia,
    colors,
    template: portfolio.template_id || 'creative-portfolio',
  };
}

