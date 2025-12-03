import { PanelUI } from "@iwsdk/core";
import { bindPanelButton } from "../utils/panelBindings.js";
import { CAMERA, PORTAL, UI_TEXT } from "../constants/sceneConstants.js";
import { safeDynamicImport, handleSceneLoadError } from "../utils/errorHandler.js";
import { logger } from "../utils/logger.js";

/**
 * Creates a back button entity that navigates to the main hall scene.
 *
 * @param {Object} world - The IWSDK world instance
 * @param {Object} sceneManager - The scene manager instance
 * @param {Array} entities - Array to add the created entity to
 * @returns {Entity} The created back button entity
 */
export function createBackButton(world, sceneManager, entities) {
  const entity = world.createTransformEntity().addComponent(PanelUI, {
    config: PORTAL.PANEL.configPath,
    maxWidth: PORTAL.PANEL.maxWidth,
    maxHeight: PORTAL.PANEL.maxHeight
  });

  // Position back button in the middle, in front of user (same Z as panels)
  entity.object3D.position.set(0, 0.8, -2.5);
  entity.object3D.lookAt(0, 1.6, 0);

  entities.push(entity);

  // Track if back button navigation is in progress
  let isNavigating = false;

  bindPanelButton(entity, {
    label: UI_TEXT.BACK_BUTTON_LABEL,
    onClick: async (event) => {
      // Prevent event bubbling and default behavior
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }

      if (isNavigating) {
        logger.warn("[BackButton] Navigation already in progress, ignoring click");
        return false;
      }

      isNavigating = true;
      logger.info("[BackButton] Back button clicked, navigating to Main Hall");

      try {
        const module = await safeDynamicImport(
          () => import("../scenes/MainHallScene.js"),
          "MainHallScene"
        );
        if (!module?.MainHallScene) {
          logger.warn('[BackButton] "MainHallScene" export not found.');
          isNavigating = false;
          return false;
        }
        sceneManager.loadScene(module.MainHallScene);
        // Reset after delay
        setTimeout(() => {
          isNavigating = false;
        }, 2000);
      } catch (error) {
        handleSceneLoadError("MainHallScene", error);
        isNavigating = false;
      }

      return false;
    }
  });

  return entity;
}
