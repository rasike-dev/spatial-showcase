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
    // Only show forward navigation to Creator Forge
    // Back button handles going back to Innovation Lab
    const creatorForgeTeleport = teleports.find((t) => t.target === "creator_forge");

    if (!creatorForgeTeleport) {
      logger.warn("[ImpactAnalyzerScene] Creator Forge teleport not found in scene data");
      // Fallback: create it explicitly
      logger.info("[ImpactAnalyzerScene] Creating explicit Creator Forge forward navigation");
      this.createPortal("Creator Forge", 0, "creator_forge");
      return;
    }

    logger.info(
      `[ImpactAnalyzerScene] Rendering forward teleport to Creator Forge: ${creatorForgeTeleport.label}`
    );

    // Center the single forward navigation button
    this.createPortal(creatorForgeTeleport.label, 0, creatorForgeTeleport.target);

    logger.info(
      `[ImpactAnalyzerScene] Created forward navigation portal to Creator Forge: ${creatorForgeTeleport.label}`
    );
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

    // Create a unique handler for this portal
    const handleClick = (event) => {
      logger.info(`[ImpactAnalyzerScene] Click handler called for: ${label}`, {
        event,
        targetSceneId,
        isNavigating: this.isNavigating
      });

      if (this.isNavigating) {
        logger.warn("[ImpactAnalyzerScene] Navigation already in progress, ignoring click");
        return;
      }

      // Validate target scene
      if (targetSceneId !== "creator_forge") {
        logger.warn(
          `[ImpactAnalyzerScene] Invalid target scene: ${targetSceneId}, expected creator_forge`
        );
        return;
      }

      this.isNavigating = true;
      logger.info(`[ImpactAnalyzerScene] Starting navigation: ${label} -> creator_forge`);

      // Navigate to Creator Forge - don't prevent default, just navigate
      this.navigateToScene("creator_forge")
        .then(() => {
          logger.info("[ImpactAnalyzerScene] Navigation to Creator Forge successful");
        })
        .catch((error) => {
          logger.error("[ImpactAnalyzerScene] Navigation failed:", error);
          // Reset flag on error so user can try again
          this.isNavigating = false;
        })
        .finally(() => {
          // Reset after a longer delay to ensure scene transition completes
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
    logger.info(`[ImpactAnalyzerScene] Button binding initiated for: ${label}`);

    logger.info(`[ImpactAnalyzerScene] Portal "${label}" created successfully`);
  }
}

