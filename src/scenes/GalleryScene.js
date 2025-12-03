import { PanelUI } from "@iwsdk/core";
import { CAMERA } from "../constants/sceneConstants.js";
import { logger } from "../utils/logger.js";
import { BaseScene } from "./BaseScene.js";
import { getShowcaseScene } from "../content/showcaseContent.js";
import { createBackButton } from "../components/BackButton.js";
import { bindPanelButton } from "../utils/panelBindings.js";
import { bindPanelContent } from "../utils/panelContent.js";

/**
 * Gallery scene showcasing AI art and photography collections.
 */
export class GalleryScene extends BaseScene {
  constructor(world, sceneManager) {
    super(world, sceneManager);
  }

  /**
   * Lifecycle hook invoked by the scene manager to set up entities.
   */
  init() {
    this.setupCamera();

    this.sceneData = getShowcaseScene("gallery");
    if (!this.sceneData) {
      logger.warn("[GalleryScene] Missing scene data for gallery");
      return;
    }

    logger.info("GalleryScene: Rendering gallery content...");

    // Render panels on both sides (like Main Hall)
    this.renderPanels(this.sceneData.panels || []);

    // Add back button in the middle
    createBackButton(this.world, this.sceneManager, this.entities);

    // Render forward navigation teleports (if any)
    this.renderTeleports(this.sceneData.teleports || []);

    logger.info(`GalleryScene: Created ${this.entities.length} entities`);
  }

  renderPanels(panels) {
    logger.info(`[GalleryScene] Starting to render ${panels.length} panels`);

    // Limit to 2 panels for side-by-side layout (like Main Hall)
    const displayPanels = panels.slice(0, 2);

    displayPanels.forEach((panel, index) => {
      logger.info(`[GalleryScene] Rendering panel ${index}: ${panel.title}`);

      const entity = this.world.createTransformEntity().addComponent(PanelUI, {
        config: "/ui/projectPanel.json",
        maxWidth: 2.0,
        maxHeight: 2.5
      });

      // Position panels side by side in front of user (same as Main Hall)
      const spacing = 2.2;
      const offsetStart = displayPanels.length > 1 ? -((displayPanels.length - 1) * spacing) / 2 : 0;
      const xOffset = offsetStart + index * spacing;

      entity.object3D.position.set(xOffset, 1.6, -3.0);
      entity.object3D.lookAt(0, 1.6, 0);

      this.trackEntity(entity);

      // Delay content binding to ensure PanelUI is fully initialized
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Bind panel content with images
          bindPanelContent(entity, {
            title: panel.title,
            description: panel.description || "",
            image: panel.image || ""
          });
        });
      });

      logger.info(`[GalleryScene] Panel ${index} created at position (${xOffset}, 1.6, -3.0)`);
    });

    logger.info(`[GalleryScene] Created ${displayPanels.length} gallery panels`);
  }

  renderTeleports(teleports) {
    // Filter out "Main Hall" teleport since we have back button
    const forwardTeleports = teleports.filter((t) => t.target !== "main_hall");

    if (forwardTeleports.length === 0) {
      logger.info("[GalleryScene] No forward teleports to render");
      return;
    }

    logger.info(`[GalleryScene] Rendering ${forwardTeleports.length} forward teleports`);

    // Position teleports below panels
    const spacing = 1.8;
    const offsetStart =
      forwardTeleports.length > 1 ? -((forwardTeleports.length - 1) * spacing) / 2 : 0;

    forwardTeleports.forEach((teleport, index) => {
      const xOffset = offsetStart + index * spacing;
      this.createPortal(teleport.label, xOffset, teleport.target);
    });

    logger.info(`[GalleryScene] Created ${forwardTeleports.length} forward navigation portals`);
  }

  createPortal(label, xOffset, targetSceneId) {
    logger.info(`[GalleryScene] Creating portal: ${label} at x=${xOffset}`);

    const entity = this.world.createTransformEntity().addComponent(PanelUI, {
      config: "/ui/portalPanel.json",
      maxWidth: 1.2,
      maxHeight: 0.5
    });

    entity.object3D.position.set(xOffset, 0.8, -2.5);
    entity.object3D.lookAt(0, 1.6, 0);

    this.trackEntity(entity);

    bindPanelButton(entity, {
      label,
      onClick: () => {
        logger.info(`[GalleryScene] Portal clicked: ${label} -> ${targetSceneId}`);
        this.navigateToScene(targetSceneId);
      }
    });

    logger.info(`[GalleryScene] Portal "${label}" created successfully`);
  }
}

