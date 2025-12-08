import { PanelUI } from "@iwsdk/core";
import { bindPanelButton } from "../utils/panelBindings.js";
import { bindPanelContent } from "../utils/panelContent.js";
import { CAMERA, PORTAL } from "../constants/sceneConstants.js";
import { logger } from "../utils/logger.js";
import { BaseScene } from "./BaseScene.js";
import { getShowcaseScene } from "../content/showcaseContent.js";
import { getTemplateLayout, calculatePanelPositions, applyTemplateColors } from "../utils/templateRenderer.js";

/**
 * Main hall scene that acts as the navigation hub for all other scenes.
 */
export class MainHallScene extends BaseScene {
  constructor(world, sceneManager) {
    super(world, sceneManager);
    this.portfolioData = null; // Store portfolio data for use in renderPanels
  }

  /**
   * Lifecycle hook invoked by the scene manager to set up entities.
   * @param {Object} options - Optional scene data
   * @param {Object} options.portfolioData - Portfolio data from API
   */
  init(options = {}) {
    // Set camera position on entering scene
    this.setupCamera();

    // Check if we have portfolio data from API
    this.portfolioData = options?.portfolioData || this.world.portfolioData;

    if (this.portfolioData && this.portfolioData.panels) {
      // Use portfolio data from API
      logger.info("[MainHallScene] Using portfolio data from API");
      logger.info("[MainHallScene] Panels count:", this.portfolioData.panels?.length || 0);
      logger.info("[MainHallScene] Panels data:", this.portfolioData.panels);
      logger.info("[MainHallScene] Main Hall Project:", this.portfolioData.mainHallProject);
      logger.info("[MainHallScene] Other Projects:", this.portfolioData.otherProjects?.length || 0);
      
      const panels = this.portfolioData.panels || [];
      const otherProjects = this.portfolioData.otherProjects || [];
      
      if (panels.length === 0) {
        logger.warn("[MainHallScene] No panels found for Main Hall! Check if first project has media items.");
      }
      
      // Apply template colors if available
      if (this.portfolioData.colors) {
        this.applyTemplateColors(this.portfolioData.colors);
      }

      // Render Main Hall panels (all panels for the first project)
      const templateId = this.portfolioData.template || 'creative-portfolio';
      this.renderPanels(panels, templateId);
      
      // Render navigation buttons to other project rooms/levels
      if (otherProjects.length > 0) {
        this.renderProjectRoomNavigation(otherProjects);
      }
    } else {
      // Fallback to default content
      this.sceneData = getShowcaseScene("main_hall");
      if (!this.sceneData) {
        logger.error("[MainHallScene] Missing scene data for main_hall");
        return;
      }

      logger.info("[MainHallScene] Using default scene data:", this.sceneData);
      const panels = this.sceneData.panels || [];
      const teleports = this.sceneData.teleports || [];

      this.renderPanels(panels);
      this.renderTeleports(teleports);
    }

    logger.info(`[MainHallScene] Created ${this.entities.length} entities`);
  }

  /**
   * Apply template colors to the scene
   */
  applyTemplateColors(colors) {
    this.templateColors = colors;
    logger.info("[MainHallScene] Template colors stored:", colors);
    
    // Apply colors to all panel entities
    this.entities.forEach(entity => {
      if (entity.hasComponent && entity.hasComponent(PanelUI)) {
        applyTemplateColors(colors, entity);
      }
    });
  }

  renderPanels(panels, templateId = 'creative-portfolio') {
    logger.info(`[MainHallScene] Starting to render ${panels.length} panels with template: ${templateId}`);
    console.log(`[MainHallScene] Rendering ${panels.length} panels:`, panels);

    // Get template-specific layout
    const layout = getTemplateLayout(templateId);
    console.log(`[MainHallScene] Layout config:`, layout);
    
    const positions = calculatePanelPositions(panels, layout);
    console.log(`[MainHallScene] Calculated positions for ${panels.length} panels:`, positions);

    panels.forEach((panel, index) => {
      logger.info(`[MainHallScene] Rendering panel ${index}: ${panel.title}`);
      console.log(`[MainHallScene] Creating panel ${index}:`, {
        title: panel.title,
        hasImage: !!panel.image,
        hasVideo: !!panel.video,
        mediaCount: panel.media?.length || 0,
        panelId: panel.id
      });

      const entity = this.world.createTransformEntity().addComponent(PanelUI, {
        config: "/ui/projectPanel.json",
        maxWidth: layout.panelMaxWidth,
        maxHeight: layout.panelMaxHeight
      });

      // Use template-based positioning
      const position = positions[index] || { x: 0, y: 1.6, z: -3.0 };
      console.log(`[MainHallScene] Panel ${index} position:`, position);
      console.log(`[MainHallScene] Panel ${index} entity index:`, entity.index);
      entity.object3D.position.set(position.x, position.y, position.z);
      entity.object3D.lookAt(0, 1.6, 0);

      // Log the actual 3D position after setting
      console.log(`[MainHallScene] Panel ${index} actual 3D position:`, {
        x: entity.object3D.position.x,
        y: entity.object3D.position.y,
        z: entity.object3D.position.z
      });

      this.trackEntity(entity);

      // Apply template colors if available
      if (this.templateColors) {
        applyTemplateColors(this.templateColors, entity);
      }

      // Delay content binding to ensure PanelUI is fully initialized
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Get portfolio ID from world data for analytics
          const portfolioId = this.world.portfolioData?.portfolio?.id || null;
          
          // In Main Hall, panels are individual media items from the first project
          // They are directly viewable - no navigation needed
          // Each panel represents one media item from the Main Hall project
          bindPanelContent(entity, {
            title: panel.title,
            description: panel.description,
            image: panel.image,
            video: panel.video,
            media: panel.media || [], // Single media item per panel
            panelId: panel.id,
            portfolioId: portfolioId,
            // No onClick - panels are directly viewable in Main Hall
          });
        });
      });

      logger.info(`[MainHallScene] Panel ${index} created at position (${position.x}, ${position.y}, ${position.z})`);
      console.log(`[MainHallScene] ✅ Panel ${index} fully created and tracked`);
    });
    
    logger.info(`[MainHallScene] Created ${panels.length} panels with ${templateId} template`);
    console.log(`[MainHallScene] ✅ Total panels created: ${panels.length}`);
    console.log(`[MainHallScene] Total entities tracked: ${this.entities.length}`);
    
    // Verify all entities have different positions
    const entityPositions = this.entities
      .filter(e => e.object3D)
      .map(e => ({
        x: e.object3D.position.x,
        y: e.object3D.position.y,
        z: e.object3D.position.z
      }));
    console.log(`[MainHallScene] All entity positions:`, entityPositions);
  }

  renderTeleports(teleports) {
    // Position navigation buttons vertically, centered, one over another
    const verticalSpacing = 0.6; // Space between buttons vertically
    const centerY = 0.9; // Center Y position (moved up slightly)
    const offsetStart =
      teleports.length > 1 ? -((teleports.length - 1) * verticalSpacing) / 2 : 0;

    teleports.forEach((teleport, index) => {
      const yOffset = centerY + (offsetStart + index * verticalSpacing);
      // Center horizontally (x=0), stack vertically
      // Gallery (index 0) will be at top, Innovation Lab (index 1) below
      this.createPortal(teleport.label, 0, teleport.target, yOffset);
    });

    logger.info(`[MainHallScene] Created ${teleports.length} navigation portals (vertically stacked)`);
  }

  /**
   * Creates a single portal button that loads the specified scene.
   * @param {string} label - Text displayed on the portal UI
   * @param {number} xOffset - Horizontal placement of the portal (0 for centered)
   * @param {string} targetSceneName - Key of the target scene to load
   * @param {number} yOffset - Vertical placement of the portal
   */
  createPortal(label, xOffset, targetSceneName, yOffset = 0.8) {
    logger.info(`[MainHallScene] Creating portal: ${label} at x=${xOffset}, y=${yOffset}`);

    const entity = this.world.createTransformEntity().addComponent(PanelUI, {
      config: "/ui/portalPanel.json",
      maxWidth: 0.9, // Smaller width
      maxHeight: 0.35 // Smaller height
    });

    entity.object3D.position.set(xOffset, yOffset, -2.5);
    entity.object3D.lookAt(0, 1.6, 0);

    this.trackEntity(entity);

    // Simple button binding
    bindPanelButton(entity, {
      label,
      onClick: () => {
        logger.info(`[MainHallScene] Portal clicked: ${label} -> ${targetSceneName}`);
        // Pass portfolio data when navigating
        this.navigateToScene(targetSceneName, {
          portfolioData: this.portfolioData || this.world.portfolioData
        });
      }
    });

    logger.info(`[MainHallScene] Portal "${label}" created successfully`);
  }

  /**
   * Render navigation buttons to other project rooms/levels
   * @param {Array} otherProjects - Projects that are not the main hall
   */
  renderProjectRoomNavigation(otherProjects) {
    logger.info(`[MainHallScene] Rendering navigation to ${otherProjects.length} other project rooms`);
    
    // Position navigation buttons vertically, to the right side
    const verticalSpacing = 0.6;
    const centerY = 0.9;
    const xOffset = 2.0; // Position to the right
    const offsetStart = otherProjects.length > 1 ? -((otherProjects.length - 1) * verticalSpacing) / 2 : 0;

    otherProjects.forEach((project, index) => {
      const yOffset = centerY + (offsetStart + index * verticalSpacing);
      
      const entity = this.world.createTransformEntity().addComponent(PanelUI, {
        config: "/ui/portalPanel.json",
        maxWidth: 0.9,
        maxHeight: 0.35
      });

      entity.object3D.position.set(xOffset, yOffset, -2.5);
      entity.object3D.lookAt(0, 1.6, 0);

      this.trackEntity(entity);

      // Create navigation button to project room
      bindPanelButton(entity, {
        label: project.title || `Level ${(project.order_index ?? 0) + 1}`,
        onClick: () => {
          logger.info(`[MainHallScene] Navigating to project room: ${project.title}`);
          this.navigateToProjectRoom(project);
        }
      });

      logger.info(`[MainHallScene] Navigation button created for: ${project.title}`);
    });
  }

  /**
   * Navigate to a project room (another level)
   * @param {Object} projectData - Project data for the room
   */
  navigateToProjectRoom(projectData) {
    if (!projectData) {
      logger.warn("[MainHallScene] No project data provided for navigation");
      return;
    }

    logger.info(`[MainHallScene] Navigating to project room: ${projectData.title}`);

    // Import and load ProjectDetailScene (which acts as a project room)
    import("./ProjectDetailScene.js").then((module) => {
      const ProjectDetailScene = module.ProjectDetailScene;
      if (ProjectDetailScene) {
        this.sceneManager.loadScene(ProjectDetailScene, {
          projectData: projectData,
          project: projectData, // Support both names for compatibility
          portfolioData: this.portfolioData || this.world.portfolioData
        });
      } else {
        logger.error("[MainHallScene] ProjectDetailScene class not found");
      }
    }).catch((error) => {
      logger.error("[MainHallScene] Failed to load ProjectDetailScene:", error);
    });
  }
}
