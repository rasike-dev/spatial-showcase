import { PanelUI } from "@iwsdk/core";
import { CAMERA, CONTENT_PANEL } from "../constants/sceneConstants.js";
import { logger } from "../utils/logger.js";
import { BaseScene } from "./BaseScene.js";
import { getShowcaseScene } from "../content/showcaseContent.js";
import { createBackButton } from "../components/BackButton.js";
import { bindPanelButton } from "../utils/panelBindings.js";
import { bindPanelContent } from "../utils/panelContent.js";

/**
 * Creator Forge scene showcasing workflow and tools.
 */
export class CreatorForgeScene extends BaseScene {
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

    this.sceneData = getShowcaseScene("creator_forge");
    if (!this.sceneData) {
      logger.warn("[CreatorForgeScene] Missing scene data for creator_forge");
      return;
    }

    logger.info("CreatorForgeScene: Rendering workflow panels...");

    // Render panels on both sides (like Main Hall)
    this.renderPanels(this.sceneData.panels || []);

    // Add back button in the middle
    createBackButton(this.world, this.sceneManager, this.entities);

    // Render forward teleports (if any)
    this.renderTeleports(this.sceneData.teleports || []);

    logger.info(`CreatorForgeScene: Created ${this.entities.length} entities`);
  }

  renderPanels(panels) {
    logger.info(`[CreatorForgeScene] Starting to render ${panels.length} panels`);

    // Limit to 2 panels for side-by-side layout (like Main Hall)
    const displayPanels = panels.slice(0, 2);

    displayPanels.forEach((panel, index) => {
      logger.info(`[CreatorForgeScene] Rendering panel ${index}: ${panel.title}`);

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

      logger.info(`[CreatorForgeScene] Panel ${index} created at position (${xOffset}, 1.6, -3.0)`);
    });

    logger.info(`[CreatorForgeScene] Created ${displayPanels.length} workflow panels`);
  }

  renderTeleports(teleports) {
    // Filter out "Impact Analyzer" teleport (back button handles going back)
    // Only show forward navigation
    const forwardTeleports = teleports.filter((t) => t.target !== "impact_analyzer");

    if (forwardTeleports.length === 0) {
      logger.info("[CreatorForgeScene] No forward teleports to render");
      return;
    }

    // Only show one forward button - position it below back button
    const teleport = forwardTeleports[0];
    logger.info(`[CreatorForgeScene] Rendering forward teleport: ${teleport.label}`);

    // Position forward button below back button (vertically stacked, centered)
    // Back button is at x=0, y=1.0 (top)
    // Forward button at x=0, y=0.5 (bottom) - more spacing to avoid overlap
    this.createPortal(teleport.label, 0, teleport.target, 0.5);

    logger.info(`[CreatorForgeScene] Created forward navigation portal: ${teleport.label}`);
  }

  createPortal(label, xOffset, targetSceneId, yOffset = 0.8) {
    logger.info(`[CreatorForgeScene] Creating portal: ${label} at x=${xOffset}, y=${yOffset}`);

    const entity = this.world.createTransformEntity().addComponent(PanelUI, {
      config: "/ui/portalPanel.json",
      maxWidth: 0.9, // Smaller width
      maxHeight: 0.35 // Smaller height
    });

    entity.object3D.position.set(xOffset, yOffset, -2.5);
    entity.object3D.lookAt(0, 1.6, 0);

    this.trackEntity(entity);

    // Create a unique handler for this portal
    const handleClick = (event) => {
      logger.info(`[CreatorForgeScene] Click handler called for: ${label}`, {
        event,
        targetSceneId,
        isNavigating: this.isNavigating
      });

      if (this.isNavigating) {
        logger.warn("[CreatorForgeScene] Navigation already in progress, ignoring click");
        return;
      }

      // Validate target scene
      if (targetSceneId !== "contact_portal") {
        logger.warn(
          `[CreatorForgeScene] Invalid target scene: ${targetSceneId}, expected contact_portal`
        );
        return;
      }

      this.isNavigating = true;
      logger.info(`[CreatorForgeScene] Starting navigation: ${label} -> contact_portal`);

      // Navigate to Contact Portal
      this.navigateToScene("contact_portal")
        .then(() => {
          logger.info("[CreatorForgeScene] Navigation to Contact Portal successful");
        })
        .catch((error) => {
          logger.error("[CreatorForgeScene] Navigation failed:", error);
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
    logger.info(`[CreatorForgeScene] Button binding initiated for: ${label}`);

    logger.info(`[CreatorForgeScene] Portal "${label}" created successfully`);
  }
}

