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
    const portfolioData = options?.portfolioData || this.world.portfolioData;

    if (portfolioData && portfolioData.panels) {
      // Use portfolio data from API
      logger.info("[MainHallScene] Using portfolio data from API:", portfolioData);
      const panels = portfolioData.panels || [];
      
      // Apply template colors if available
      if (portfolioData.colors) {
        this.applyTemplateColors(portfolioData.colors);
      }

      // Render panels with template-specific layout
      const templateId = portfolioData.template || 'creative-portfolio';
      this.renderPanels(panels, templateId);
      
      // Use default teleports for now (can be customized per template later)
      const defaultSceneData = getShowcaseScene("main_hall");
      const teleports = defaultSceneData?.teleports || [];
      this.renderTeleports(teleports);
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

    // Get template-specific layout
    const layout = getTemplateLayout(templateId);
    const positions = calculatePanelPositions(panels, layout);

    panels.forEach((panel, index) => {
      logger.info(`[MainHallScene] Rendering panel ${index}: ${panel.title}`);

      const entity = this.world.createTransformEntity().addComponent(PanelUI, {
        config: "/ui/projectPanel.json",
        maxWidth: layout.panelMaxWidth,
        maxHeight: layout.panelMaxHeight
      });

      // Use template-based positioning
      const position = positions[index] || { x: 0, y: 1.6, z: -3.0 };
      entity.object3D.position.set(position.x, position.y, position.z);
      entity.object3D.lookAt(0, 1.6, 0);

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
          
          // Bind panel content - supports both API data and static data
          bindPanelContent(entity, {
            title: panel.title,
            description: panel.description,
            image: panel.image,
            video: panel.video, // Support video from API
            media: panel.media, // Support multiple media items
            panelId: panel.id, // For analytics
            portfolioId: portfolioId, // For analytics
          });
        });
      });

      logger.info(`[MainHallScene] Panel ${index} created at position (${position.x}, ${position.y}, ${position.z})`);
    });
    logger.info(`[MainHallScene] Created ${panels.length} panels with ${templateId} template`);
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
        this.navigateToScene(targetSceneName);
      }
    });

    logger.info(`[MainHallScene] Portal "${label}" created successfully`);
  }
}
