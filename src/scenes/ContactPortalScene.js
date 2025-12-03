import { PanelUI, PanelDocument } from "@iwsdk/core";
import { logger } from "../utils/logger.js";
import { BaseScene } from "./BaseScene.js";
import { getShowcaseScene } from "../content/showcaseContent.js";
import { createBackButton } from "../components/BackButton.js";
import { bindPanelButton } from "../utils/panelBindings.js";
import { bindPanelContent } from "../utils/panelContent.js";

/**
 * Contact Portal scene with contact information and external link.
 */
export class ContactPortalScene extends BaseScene {
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

    this.sceneData = getShowcaseScene("contact_portal");
    if (!this.sceneData) {
      logger.warn("[ContactPortalScene] Missing scene data for contact_portal");
      return;
    }

    logger.info("ContactPortalScene: Rendering contact panel...");

    // Render panels (centered for single panel)
    this.renderPanels(this.sceneData.panels || []);

    // Add back button in the middle
    createBackButton(this.world, this.sceneManager, this.entities);

    // Render teleports (if any)
    this.renderTeleports(this.sceneData.teleports || []);

    logger.info(`ContactPortalScene: Created ${this.entities.length} entities`);
  }

  renderPanels(panels) {
    logger.info(`[ContactPortalScene] Starting to render ${panels.length} panels`);

    panels.forEach((panel) => {
      logger.info(`[ContactPortalScene] Rendering panel: ${panel.title}`);

      const entity = this.world.createTransformEntity().addComponent(PanelUI, {
        config: "/ui/contactPanel.json",
        maxWidth: 2.0,
        maxHeight: 2.5
      });

      // Center the panel
      entity.object3D.position.set(0, 1.6, -3.0);
      entity.object3D.lookAt(0, 1.6, 0);

      this.trackEntity(entity);

      // Delay content binding to ensure PanelUI is fully initialized
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Bind panel content
          bindPanelContent(entity, {
            title: panel.title,
            description: panel.description || ""
          });

          // Bind external link button if portal URL exists
          if (this.sceneData.portal) {
            this.bindExternalLinkButton(entity, panel.cta || "Visit Website");
          }
        });
      });

      logger.info("[ContactPortalScene] Panel created at position (0, 1.6, -3.0)");
    });

    logger.info(`[ContactPortalScene] Created ${panels.length} contact panels`);
  }

  bindExternalLinkButton(entity, buttonText) {
    function attemptBinding(attempt = 0) {
      const document = PanelDocument.data.document[entity.index];
      if (!document) {
        if (attempt < 120) {
          requestAnimationFrame(() => attemptBinding(attempt + 1));
        } else {
          logger.warn(
            `[ContactPortalScene] Document not ready for external link button after ${attempt} attempts`
          );
        }
        return;
      }

      const buttonElement = document.getElementById?.("contact-button");
      const buttonTextElement = document.getElementById?.("contact-button-text");

      if (buttonElement && buttonTextElement) {
        // Set button text
        if (buttonTextElement.setProperties) {
          buttonTextElement.setProperties({ text: buttonText });
        } else if (buttonTextElement.textContent !== undefined) {
          buttonTextElement.textContent = buttonText;
        }

        // Bind click handler
        if (!buttonElement.__externalLinkAttached) {
          const handleClick = () => {
            logger.info(`[ContactPortalScene] Opening external portal: ${this.sceneData.portal}`);
            window.open(this.sceneData.portal, "_blank");
          };

          buttonElement.addEventListener?.("click", handleClick);
          buttonElement.__externalLinkAttached = true;
          logger.info(`[ContactPortalScene] External link button bound for entity ${entity.index}`);
        }
      } else if (attempt < 120) {
        requestAnimationFrame(() => attemptBinding(attempt + 1));
      } else {
        logger.warn(
          `[ContactPortalScene] Contact button elements not found for entity ${entity.index}`
        );
      }
    }

    attemptBinding();
  }

  renderTeleports(teleports) {
    // Filter out "Main Hall" teleport (back button handles going back)
    const forwardTeleports = teleports.filter((t) => t.target !== "main_hall");

    if (forwardTeleports.length === 0) {
      logger.info("[ContactPortalScene] No forward teleports to render");
      return;
    }

    logger.info(`[ContactPortalScene] Rendering ${forwardTeleports.length} teleports`);

    // Position teleports below panel
    const spacing = 1.8;
    const offsetStart =
      forwardTeleports.length > 1 ? -((forwardTeleports.length - 1) * spacing) / 2 : 0;

    forwardTeleports.forEach((teleport, index) => {
      const xOffset = offsetStart + index * spacing;
      this.createPortal(teleport.label, xOffset, teleport.target);
    });

    logger.info(`[ContactPortalScene] Created ${forwardTeleports.length} navigation portals`);
  }

  createPortal(label, xOffset, targetSceneId) {
    logger.info(`[ContactPortalScene] Creating portal: ${label} at x=${xOffset}`);

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
      logger.info(`[ContactPortalScene] Click handler called for: ${label}`, {
        event,
        targetSceneId,
        isNavigating: this.isNavigating
      });

      if (this.isNavigating) {
        logger.warn("[ContactPortalScene] Navigation already in progress, ignoring click");
        return;
      }

      this.isNavigating = true;
      logger.info(`[ContactPortalScene] Starting navigation: ${label} -> ${targetSceneId}`);

      this.navigateToScene(targetSceneId)
        .then(() => {
          logger.info(`[ContactPortalScene] Navigation to ${targetSceneId} successful`);
        })
        .catch((error) => {
          logger.error("[ContactPortalScene] Navigation failed:", error);
          this.isNavigating = false;
        })
        .finally(() => {
          setTimeout(() => {
            this.isNavigating = false;
          }, 2000);
        });
    };

    bindPanelButton(entity, {
      label,
      onClick: handleClick
    });
    logger.info(`[ContactPortalScene] Portal "${label}" created successfully`);
  }
}

