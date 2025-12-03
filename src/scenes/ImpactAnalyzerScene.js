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
    // Shared navigation flag to prevent multiple clicks
    this.isNavigating = false;
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

    // Render navigation buttons (forward and backward) - no separate back button needed
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
    // Separate forward and backward navigation buttons
    const forwardTeleport = teleports.find((t) => t.target === "creator_forge");
    const backwardTeleport = teleports.find((t) => t.target === "innovation_lab");

    if (!forwardTeleport && !backwardTeleport) {
      logger.warn("[ImpactAnalyzerScene] No teleports found in scene data");
      return;
    }

    // Position buttons side by side: backward on left, forward on right
    const spacing = 1.8;
    let buttonIndex = 0;

    // Backward button (left) - goes to Innovation Lab
    if (backwardTeleport) {
      logger.info(
        `[ImpactAnalyzerScene] Rendering backward teleport to Innovation Lab: ${backwardTeleport.label}`
      );
      this.createPortal(backwardTeleport.label, -spacing / 2, backwardTeleport.target, "backward");
      buttonIndex++;
    }

    // Forward button (right) - goes to Creator Forge
    if (forwardTeleport) {
      logger.info(
        `[ImpactAnalyzerScene] Rendering forward teleport to Creator Forge: ${forwardTeleport.label}`
      );
      this.createPortal(forwardTeleport.label, spacing / 2, forwardTeleport.target, "forward");
      buttonIndex++;
    }

    logger.info(
      `[ImpactAnalyzerScene] Created ${buttonIndex} navigation buttons (backward + forward)`
    );
  }

  createPortal(label, xOffset, targetSceneId, direction = "forward") {
    logger.info(
      `[ImpactAnalyzerScene] Creating ${direction} portal: ${label} at x=${xOffset} -> ${targetSceneId}`
    );

    const entity = this.world.createTransformEntity().addComponent(PanelUI, {
      config: "/ui/portalPanel.json",
      maxWidth: 1.2,
      maxHeight: 0.5
    });

    entity.object3D.position.set(xOffset, 0.8, -2.5);
    entity.object3D.lookAt(0, 1.6, 0);

    this.trackEntity(entity);

    // Create a unique handler for this portal
    const handleClick = (event) => {
      logger.info(`[ImpactAnalyzerScene] ${direction} button clicked: ${label}`, {
        event,
        targetSceneId,
        direction,
        isNavigating: this.isNavigating
      });

      if (this.isNavigating) {
        logger.warn("[ImpactAnalyzerScene] Navigation already in progress, ignoring click");
        return;
      }

      // Validate target scene based on direction
      if (direction === "forward" && targetSceneId !== "creator_forge") {
        logger.warn(
          `[ImpactAnalyzerScene] Invalid forward target: ${targetSceneId}, expected creator_forge`
        );
        return;
      }
      if (direction === "backward" && targetSceneId !== "innovation_lab") {
        logger.warn(
          `[ImpactAnalyzerScene] Invalid backward target: ${targetSceneId}, expected innovation_lab`
        );
        return;
      }

      this.isNavigating = true;
      logger.info(`[ImpactAnalyzerScene] Starting ${direction} navigation: ${label} -> ${targetSceneId}`);

      // Navigate to target scene
      this.navigateToScene(targetSceneId)
        .then(() => {
          logger.info(`[ImpactAnalyzerScene] Navigation to ${targetSceneId} successful`);
        })
        .catch((error) => {
          logger.error(`[ImpactAnalyzerScene] Navigation to ${targetSceneId} failed:`, error);
          // Reset flag on error so user can try again
          this.isNavigating = false;
        })
        .finally(() => {
          // Reset after a delay to ensure scene transition completes
          setTimeout(() => {
            this.isNavigating = false;
          }, 2000);
        });
    };

    // Bind immediately - don't delay
    bindPanelButton(entity, {
      label,
      onClick: handleClick
    });
    logger.info(`[ImpactAnalyzerScene] ${direction} button "${label}" bound successfully`);
  }
}

