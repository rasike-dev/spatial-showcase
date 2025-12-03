import { PanelUI } from "@iwsdk/core";
import { bindPanelButton } from "../utils/panelBindings.js";
import { bindPanelContent } from "../utils/panelContent.js";
import { CAMERA, PORTAL } from "../constants/sceneConstants.js";
import { logger } from "../utils/logger.js";
import { BaseScene } from "./BaseScene.js";
import { getShowcaseScene } from "../content/showcaseContent.js";

/**
 * Main hall scene that acts as the navigation hub for all other scenes.
 */
export class MainHallScene extends BaseScene {
  constructor(world, sceneManager) {
    super(world, sceneManager);
  }

  /**
   * Lifecycle hook invoked by the scene manager to set up entities.
   */
  init() {
    // Set camera position on entering scene
    this.setupCamera();

    this.sceneData = getShowcaseScene("main_hall");
    if (!this.sceneData) {
      logger.error("[MainHallScene] Missing scene data for main_hall");
      return;
    }

    logger.info("[MainHallScene] Scene data loaded:", this.sceneData);
    logger.info("MainHallScene: Rendering panels and teleports from content...");

    const panels = this.sceneData.panels || [];
    const teleports = this.sceneData.teleports || [];

    logger.info(`[MainHallScene] About to render ${panels.length} panels and ${teleports.length} teleports`);

    this.renderPanels(panels);
    this.renderTeleports(teleports);

    logger.info(`[MainHallScene] Created ${this.entities.length} entities`);
  }

  renderPanels(panels) {
    logger.info(`[MainHallScene] Starting to render ${panels.length} panels`);

    panels.forEach((panel, index) => {
      logger.info(`[MainHallScene] Rendering panel ${index}: ${panel.title}`);

      const entity = this.world.createTransformEntity().addComponent(PanelUI, {
        config: "/ui/projectPanel.json",
        maxWidth: 2.0,
        maxHeight: 2.5
      });

      // Position panels side by side in front of user
      const spacing = 2.2;
      const offsetStart = panels.length > 1 ? -((panels.length - 1) * spacing) / 2 : 0;
      const xOffset = offsetStart + index * spacing;

      entity.object3D.position.set(xOffset, 1.6, -3.0);
      entity.object3D.lookAt(0, 1.6, 0);

      this.trackEntity(entity);

      // Delay content binding to ensure PanelUI is fully initialized
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Bind panel content with static images
          bindPanelContent(entity, {
            title: panel.title,
            description: panel.description,
            image: panel.image
          });
        });
      });

      logger.info(`[MainHallScene] Panel ${index} created at position (${xOffset}, 1.6, -3.0)`);
    });
    logger.info(`[MainHallScene] Created ${panels.length} welcome panels`);
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
