import { PanelUI } from "@iwsdk/core";
import { CAMERA, CONTENT_PANEL } from "../constants/sceneConstants.js";
import { logger } from "../utils/logger.js";
import { BaseScene } from "./BaseScene.js";
import { getShowcaseScene } from "../content/showcaseContent.js";
import { createBackButton } from "../components/BackButton.js";
import { bindPanelButton } from "../utils/panelBindings.js";

/**
 * Contact Portal scene with contact information and external link.
 */
export class ContactPortalScene extends BaseScene {
  constructor(world, sceneManager) {
    super(world, sceneManager);
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
    createBackButton(this.world, this.sceneManager, this.entities);
    this.renderPanels(this.sceneData.panels || []);
    this.renderTeleports(this.sceneData.teleports || []);

    logger.info(`ContactPortalScene: Created ${this.entities.length} entities`);
  }

  renderPanels(panels) {
    panels.forEach((panel) => {
      const entity = this.world.createTransformEntity().addComponent(PanelUI, {
        config: "/ui/contactPanel.json",
        maxWidth: CONTENT_PANEL.maxWidth,
        maxHeight: CONTENT_PANEL.maxHeight,
        dynamicTitle: panel.title,
        dynamicDescription: panel.description || "",
        dynamicCta: panel.cta || "Visit Website"
      });

      entity.object3D.position.set(0, CONTENT_PANEL.Y_POSITION, CONTENT_PANEL.Z_POSITION);
      entity.object3D.lookAt(
        CAMERA.DEFAULT_POSITION.x,
        CAMERA.DEFAULT_POSITION.y,
        CAMERA.DEFAULT_POSITION.z
      );

      this.trackEntity(entity);

      // If there's a portal URL, bind a button to open it
      if (this.sceneData.portal) {
        bindPanelButton(entity, {
          label: panel.cta || "Visit Website",
          buttonId: "contact-button",
          onClick: () => {
            logger.info(`Opening external portal: ${this.sceneData.portal}`);
            window.open(this.sceneData.portal, "_blank");
          }
        });
      }
    });
  }

  renderTeleports(teleports) {
    teleports.forEach((teleport, index) => {
      this.createPortal(teleport.label, 0, teleport.target);
    });
    logger.info(`[ContactPortalScene] Created ${teleports.length} navigation portals`);
  }

  createPortal(label, xOffset, targetSceneId) {
    logger.debug(`Creating portal: ${label} at x=${xOffset}`);

    const entity = this.world.createTransformEntity().addComponent(PanelUI, {
      config: "/ui/portalPanel.json",
      maxWidth: 1.1,
      maxHeight: 0.45
    });

    entity.object3D.position.set(xOffset, 1.4, 2);
    entity.object3D.lookAt(
      CAMERA.DEFAULT_POSITION.x,
      CAMERA.DEFAULT_POSITION.y,
      CAMERA.DEFAULT_POSITION.z
    );

    this.trackEntity(entity);
    bindPanelButton(entity, {
      label,
      onClick: () => this.navigateToScene(targetSceneId)
    });
  }
}

