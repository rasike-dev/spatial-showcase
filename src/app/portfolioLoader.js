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
    console.log('[PortfolioLoader] Projects before media loading:', projects);
    console.log('[PortfolioLoader] ⚠️ ABOUT TO LOAD MEDIA FOR', projects.length, 'PROJECTS');

    // Load media for each project and portfolio
    console.log('[PortfolioLoader] ⚠️ STARTING MEDIA LOADING FOR', projects.length, 'PROJECTS');
    const projectsWithMedia = await Promise.all(
      projects.map(async (project) => {
        console.log(`[PortfolioLoader] ⚠️ Loading media for project ${project.id} (${project.title})`);
        logger.info(`[PortfolioLoader] Loading media for project ${project.id} (${project.title})`);
        try {
          const media = await getMedia(project.id, null);
          console.log(`[PortfolioLoader] ⚠️ Project ${project.id} has ${media.length} media items:`, media);
          logger.info(`[PortfolioLoader] Project ${project.id} has ${media.length} media items`);
          const projectWithMedia = {
            ...project,
            media: media.map(m => ({
              ...m,
              url: getMediaUrl(m.url),
            })),
          };
          console.log(`[PortfolioLoader] ⚠️ Project ${project.id} after media attachment:`, {
            id: projectWithMedia.id,
            title: projectWithMedia.title,
            mediaCount: projectWithMedia.media.length,
            media: projectWithMedia.media
          });
          return projectWithMedia;
        } catch (error) {
          console.error(`[PortfolioLoader] ❌ ERROR loading media for project ${project.id}:`, error);
          logger.error(`[PortfolioLoader] Error loading media for project ${project.id}:`, error);
          return {
            ...project,
            media: [], // Return project with empty media array on error
          };
        }
      })
    );
    
    console.log('[PortfolioLoader] ⚠️ Projects after media loading:', projectsWithMedia);
    console.log('[PortfolioLoader] ⚠️ Media counts:', projectsWithMedia.map(p => ({ id: p.id, title: p.title, mediaCount: p.media?.length || 0 })));
    logger.info('[PortfolioLoader] Projects with media loaded:', projectsWithMedia.map(p => ({
      id: p.id,
      title: p.title,
      mediaCount: p.media?.length || 0
    })));

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

  // Sort projects by order_index (each project = one room/level)
  console.log('[PortfolioLoader] Converting to scene data. Projects received:', projects);
  logger.info('[PortfolioLoader] Converting to scene data. Projects received:', projects.length);
  
  const sortedProjects = [...projects].sort((a, b) => {
    const aIndex = a.order_index ?? 0;
    const bIndex = b.order_index ?? 0;
    if (aIndex !== bIndex) return aIndex - bIndex;
    // If order_index is the same, sort by creation date
    return new Date(a.created_at) - new Date(b.created_at);
  });
  
  console.log('[PortfolioLoader] Sorted projects:', sortedProjects.map(p => ({
    id: p.id,
    title: p.title,
    order_index: p.order_index,
    mediaCount: p.media?.length || 0,
    media: p.media
  })));

  // Find the first project (order_index = 0) - this is the Main Hall
  const mainHallProject = sortedProjects.find(p => (p.order_index ?? 0) === 0) || sortedProjects[0];
  const otherProjects = sortedProjects.filter(p => p.id !== mainHallProject?.id);

  console.log('[PortfolioLoader] Main Hall Project found:', {
    id: mainHallProject?.id,
    title: mainHallProject?.title,
    order_index: mainHallProject?.order_index,
    mediaCount: mainHallProject?.media?.length || 0,
    media: mainHallProject?.media,
    panel_count: mainHallProject?.panel_count
  });
  
  logger.info('[PortfolioLoader] Main Hall Project:', {
    id: mainHallProject?.id,
    title: mainHallProject?.title,
    order_index: mainHallProject?.order_index,
    mediaCount: mainHallProject?.media?.length || 0,
    panel_count: mainHallProject?.panel_count
  });

  // Main Hall panels: Create one panel per media item for the first project
  // panel_count should equal number of media items (one panel per media item)
  const mainHallMedia = mainHallProject?.media || [];
  logger.info('[PortfolioLoader] Main Hall Media:', mainHallMedia.length, 'items');
  logger.info('[PortfolioLoader] Main Hall Media Details:', mainHallMedia);
  
  const mainHallPanels = mainHallMedia.map((mediaItem, index) => {
    return {
      id: `${mainHallProject.id}-panel-${index}`,
      projectId: mainHallProject.id, // Reference to the project
      title: mediaItem.filename || `${mainHallProject.title} - Panel ${index + 1}`,
      description: mediaItem.description || mainHallProject.description || '',
      image: mediaItem.type === 'image' ? mediaItem.url : null,
      video: mediaItem.type === 'video' ? mediaItem.url : null,
      media: [mediaItem], // Single media item per panel
      order_index: index,
    };
  });

  // Store projects for navigation (other levels/rooms)
  const projectRooms = sortedProjects.map(project => ({
    id: project.id,
    title: project.title,
    description: project.description,
    order_index: project.order_index ?? 0,
    panel_count: project.panel_count ?? (project.media?.length || 1),
    media: project.media || [],
    isMainHall: (project.order_index ?? 0) === 0,
  }));

  logger.info('[PortfolioLoader] Created Main Hall panels:', mainHallPanels.length);
  logger.info('[PortfolioLoader] Other projects for navigation:', otherProjects.length);

  return {
    portfolio,
    panels: mainHallPanels, // Main Hall panels (one per media item of first project)
    mainHallProject, // The first project (Main Hall)
    otherProjects, // Other projects for navigation to other levels
    projectRooms, // All projects as rooms (for navigation)
    projects: sortedProjects, // Include full sorted project data
    portfolioMedia,
    colors,
    template: portfolio.template_id || 'creative-portfolio',
  };
}

