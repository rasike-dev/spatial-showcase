import { PanelUI } from "@iwsdk/core";
import { CAMERA, CONTENT_PANEL } from "../constants/sceneConstants.js";
import { logger } from "../utils/logger.js";
import { BaseScene } from "./BaseScene.js";
import { getShowcaseScene } from "../content/showcaseContent.js";
import { createBackButton } from "../components/BackButton.js";
import { bindPanelButton } from "../utils/panelBindings.js";
import { bindPanelContent } from "../utils/panelContent.js";

/**
 * Impact Analyzer scene showcasing distributed systems architecture.
 */
export class ImpactAnalyzerScene extends BaseScene {
  constructor(world, sceneManager) {
    super(world, sceneManager);
  }

  /**
   * Lifecycle hook invoked by the scene manager to set up entities.
   */
  init() {
    this.setupCamera();

    this.sceneData = getShowcaseScene("impact_analyzer");
    if (!this.sceneData) {
      logger.warn("[ImpactAnalyzerScene] Missing scene data for impact_analyzer");
      return;
    }

    logger.info("ImpactAnalyzerScene: Rendering impact panels...");

    // Render panels on both sides (like Main Hall)
    this.renderPanels(this.sceneData.panels || []);

    // Add back button in the middle
    createBackButton(this.world, this.sceneManager, this.entities);

    // Render forward teleports (if any)
    this.renderTeleports(this.sceneData.teleports || []);

    logger.info(`ImpactAnalyzerScene: Created ${this.entities.length} entities`);
  }

  renderPanels(panels) {
    logger.info(`[ImpactAnalyzerScene] Starting to render ${panels.length} panels`);

    // For single panel, center it; for multiple, show first 2 side by side
    const displayPanels = panels.slice(0, 2);

    if (displayPanels.length === 1) {
      // Single panel - center it
      const panel = displayPanels[0];
      logger.info(`[ImpactAnalyzerScene] Rendering single panel: ${panel.title}`);

      const entity = this.world.createTransformEntity().addComponent(PanelUI, {
        config: "/ui/projectPanel.json",
        maxWidth: 2.0,
        maxHeight: 2.5
      });

      entity.object3D.position.set(0, 1.6, -3.0);
      entity.object3D.lookAt(0, 1.6, 0);

      this.trackEntity(entity);

      // Delay content binding to ensure PanelUI is fully initialized
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          bindPanelContent(entity, {
            title: panel.title,
            description: panel.description || "",
            image: panel.image || ""
          });
        });
      });

      logger.info("[ImpactAnalyzerScene] Panel created at position (0, 1.6, -3.0)");
    } else {
      // Multiple panels - side by side
      displayPanels.forEach((panel, index) => {
        logger.info(`[ImpactAnalyzerScene] Rendering panel ${index}: ${panel.title}`);

        const entity = this.world.createTransformEntity().addComponent(PanelUI, {
          config: "/ui/projectPanel.json",
          maxWidth: 2.0,
          maxHeight: 2.5
        });

        // Position panels side by side in front of user (same as Main Hall)
        const spacing = 2.2;
        const offsetStart =
          displayPanels.length > 1 ? -((displayPanels.length - 1) * spacing) / 2 : 0;
        const xOffset = offsetStart + index * spacing;

        entity.object3D.position.set(xOffset, 1.6, -3.0);
        entity.object3D.lookAt(0, 1.6, 0);

        this.trackEntity(entity);

        // Delay content binding to ensure PanelUI is fully initialized
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            bindPanelContent(entity, {
              title: panel.title,
              description: panel.description || "",
              image: panel.image || ""
            });
          });
        });

        logger.info(`[ImpactAnalyzerScene] Panel ${index} created at position (${xOffset}, 1.6, -3.0)`);
      });
    }

    logger.info(`[ImpactAnalyzerScene] Created ${displayPanels.length} impact panels`);
  }

  renderTeleports(teleports) {
    // Filter out "Innovation Lab" teleport if we came from there (back button handles going back)
    // But keep forward teleports
    const forwardTeleports = teleports.filter((t) => t.target !== "innovation_lab");

    if (forwardTeleports.length === 0) {
      logger.info("[ImpactAnalyzerScene] No forward teleports to render");
      return;
    }

    logger.info(`[ImpactAnalyzerScene] Rendering ${forwardTeleports.length} forward teleports`);

    // Position teleports below panels
    const spacing = 1.8;
    const offsetStart =
      forwardTeleports.length > 1 ? -((forwardTeleports.length - 1) * spacing) / 2 : 0;

    forwardTeleports.forEach((teleport, index) => {
      const xOffset = offsetStart + index * spacing;
      this.createPortal(teleport.label, xOffset, teleport.target);
    });

    logger.info(`[ImpactAnalyzerScene] Created ${forwardTeleports.length} forward navigation portals`);
  }

  createPortal(label, xOffset, targetSceneId) {
    logger.info(`[ImpactAnalyzerScene] Creating portal: ${label} at x=${xOffset}`);

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
        logger.info(`[ImpactAnalyzerScene] Portal clicked: ${label} -> ${targetSceneId}`);
        this.navigateToScene(targetSceneId);
      }
    });

    logger.info(`[ImpactAnalyzerScene] Portal "${label}" created successfully`);
  }
}

