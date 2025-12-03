import { PanelUI } from "@iwsdk/core";
import { CAMERA, CONTENT_PANEL } from "../constants/sceneConstants.js";
import { logger } from "../utils/logger.js";
import { BaseScene } from "./BaseScene.js";
import { getShowcaseScene } from "../content/showcaseContent.js";
import { createBackButton } from "../components/BackButton.js";
import { bindPanelButton } from "../utils/panelBindings.js";
import { bindPanelContent } from "../utils/panelContent.js";

/**
 * Innovation Lab scene showcasing technical projects and tools.
 */
export class InnovationLabScene extends BaseScene {
  constructor(world, sceneManager) {
    super(world, sceneManager);
  }

  /**
   * Lifecycle hook invoked by the scene manager to set up entities.
   */
  init() {
    this.setupCamera();

    this.sceneData = getShowcaseScene("innovation_lab");
    if (!this.sceneData) {
      logger.warn("[InnovationLabScene] Missing scene data for innovation_lab");
      return;
    }

    logger.info("InnovationLabScene: Rendering project panels...");

    // Render panels on both sides (like Main Hall)
    this.renderPanels(this.sceneData.panels || []);

    // Add back button in the middle
    createBackButton(this.world, this.sceneManager, this.entities);

    // Render forward teleports (if any)
    this.renderTeleports(this.sceneData.teleports || []);

    logger.info(`InnovationLabScene: Created ${this.entities.length} entities`);
  }

  renderPanels(panels) {
    logger.info(`[InnovationLabScene] Starting to render ${panels.length} panels`);

    // Limit to 2 panels for side-by-side layout (like Main Hall)
    const displayPanels = panels.slice(0, 2);

    displayPanels.forEach((panel, index) => {
      logger.info(`[InnovationLabScene] Rendering panel ${index}: ${panel.title}`);

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

      logger.info(`[InnovationLabScene] Panel ${index} created at position (${xOffset}, 1.6, -3.0)`);
    });

    logger.info(`[InnovationLabScene] Created ${displayPanels.length} project panels`);
  }

  renderTeleports(teleports) {
    // Only show forward navigation to Impact Analyzer
    // Back button handles going back to Main Hall
    const impactAnalyzerTeleport = teleports.find((t) => t.target === "impact_analyzer");

    if (!impactAnalyzerTeleport) {
      logger.warn("[InnovationLabScene] Impact Analyzer teleport not found in scene data");
      // Fallback: create it explicitly
      logger.info("[InnovationLabScene] Creating explicit Impact Analyzer forward navigation");
      this.createPortal("Impact Analyzer", 0, "impact_analyzer");
      return;
    }

    logger.info(
      `[InnovationLabScene] Rendering forward teleport to Impact Analyzer: ${impactAnalyzerTeleport.label}`
    );

    // Center the single forward navigation button
    this.createPortal(impactAnalyzerTeleport.label, 0, impactAnalyzerTeleport.target);

    logger.info(
      `[InnovationLabScene] Created forward navigation portal to Impact Analyzer: ${impactAnalyzerTeleport.label}`
    );
  }

  createPortal(label, xOffset, targetSceneId) {
    logger.info(`[InnovationLabScene] Creating portal: ${label} at x=${xOffset}`);

    const entity = this.world.createTransformEntity().addComponent(PanelUI, {
      config: "/ui/portalPanel.json",
      maxWidth: 1.2,
      maxHeight: 0.5
    });

    entity.object3D.position.set(xOffset, 0.8, -2.5);
    entity.object3D.lookAt(0, 1.6, 0);

    this.trackEntity(entity);

    // Prevent multiple rapid clicks
    let isNavigating = false;

    bindPanelButton(entity, {
      label,
      onClick: () => {
        if (isNavigating) {
          logger.warn("[InnovationLabScene] Navigation already in progress, ignoring click");
          return;
        }

        isNavigating = true;
        logger.info(`[InnovationLabScene] Portal clicked: ${label} -> ${targetSceneId}`);

        // Ensure we're navigating to impact_analyzer for forward navigation
        const targetScene = targetSceneId === "impact_analyzer" ? "impact_analyzer" : targetSceneId;
        logger.info(`[InnovationLabScene] Navigating to: ${targetScene}`);

        this.navigateToScene(targetScene).finally(() => {
          // Reset after a delay to allow scene transition
          setTimeout(() => {
            isNavigating = false;
          }, 1000);
        });
      }
    });

    logger.info(`[InnovationLabScene] Portal "${label}" created successfully`);
  }
}

