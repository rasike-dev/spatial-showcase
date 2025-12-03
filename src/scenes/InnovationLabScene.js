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
    // Shared navigation flag to prevent multiple clicks
    this.isNavigating = false;
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
      // Position forward button to the right of back button (side by side)
      this.createPortal("Impact Analyzer", 0.7, "impact_analyzer", 0.8);
      return;
    }

    logger.info(
      `[InnovationLabScene] Rendering forward teleport to Impact Analyzer: ${impactAnalyzerTeleport.label}`
    );

    // Position forward button to the right of back button (side by side)
    // Back button is at x=-0.7 (left), forward button at x=0.7 (right)
    // Both at y=0.8 for proper visibility
    this.createPortal(impactAnalyzerTeleport.label, 0.7, impactAnalyzerTeleport.target, 0.8);

    logger.info(
      `[InnovationLabScene] Created forward navigation portal to Impact Analyzer: ${impactAnalyzerTeleport.label}`
    );
  }

  createPortal(label, xOffset, targetSceneId, yOffset = 0.8) {
    logger.info(
      `[InnovationLabScene] Creating portal: ${label} at x=${xOffset}, y=${yOffset} -> ${targetSceneId}`
    );

    const entity = this.world.createTransformEntity().addComponent(PanelUI, {
      config: "/ui/portalPanel.json",
      maxWidth: 1.0, // Smaller width for better visibility
      maxHeight: 0.4 // Smaller height for better visibility
    });

    entity.object3D.position.set(xOffset, yOffset, -2.5);
    entity.object3D.lookAt(0, 1.6, 0);

    this.trackEntity(entity);

    // Create a unique handler for this portal with improved stability
    const handleClick = (event) => {
      // Stop event propagation immediately to prevent multiple handlers
      if (event) {
        event.stopPropagation();
      }

      logger.info(`[InnovationLabScene] Click handler called for: ${label}`, {
        event,
        targetSceneId,
        isNavigating: this.isNavigating,
        timestamp: Date.now()
      });

      // Early return if already navigating
      if (this.isNavigating) {
        logger.warn("[InnovationLabScene] Navigation already in progress, ignoring click");
        return;
      }

      // Validate target scene
      if (targetSceneId !== "impact_analyzer") {
        logger.warn(
          `[InnovationLabScene] Invalid target scene: ${targetSceneId}, expected impact_analyzer`
        );
        return;
      }

      // Set flag immediately to prevent multiple clicks
      this.isNavigating = true;
      logger.info(`[InnovationLabScene] Starting navigation: ${label} -> impact_analyzer`);

      // Add a small delay to ensure any previous scene transitions are complete
      // This helps with stability when navigating quickly
      setTimeout(() => {
        this.navigateToScene("impact_analyzer")
          .then(() => {
            logger.info("[InnovationLabScene] Navigation to Impact Analyzer successful");
          })
          .catch((error) => {
            logger.error("[InnovationLabScene] Navigation failed:", error);
            // Reset flag on error so user can try again
            this.isNavigating = false;
          })
          .finally(() => {
            // Reset after a longer delay to ensure scene transition completes
            setTimeout(() => {
              this.isNavigating = false;
              logger.debug("[InnovationLabScene] Navigation flag reset");
            }, 3000); // Increased delay for better stability
          });
      }, 100); // Small delay to ensure scene is ready
    };

    // Bind immediately - don't delay
    bindPanelButton(entity, {
      label,
      onClick: handleClick
    });
    logger.info(`[InnovationLabScene] Button binding initiated for: ${label}`);

    logger.info(`[InnovationLabScene] Portal "${label}" created successfully`);
  }
}

