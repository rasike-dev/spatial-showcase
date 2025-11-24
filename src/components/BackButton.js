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

  entity.object3D.position.set(0, PORTAL.DEFAULT_Y_POSITION, PORTAL.BACK_BUTTON_Z);
  entity.object3D.lookAt(
    CAMERA.DEFAULT_POSITION.x,
    CAMERA.DEFAULT_POSITION.y,
    CAMERA.DEFAULT_POSITION.z
  );

  entities.push(entity);
  bindPanelButton(entity, {
    label: UI_TEXT.BACK_BUTTON_LABEL,
    onClick: async () => {
      try {
        const module = await safeDynamicImport(
          () => import("../scenes/MainHallScene.js"),
          "MainHallScene"
        );
        if (!module?.MainHallScene) {
          logger.warn('[BackButton] "MainHallScene" export not found.');
          return;
        }
        sceneManager.loadScene(module.MainHallScene);
      } catch (error) {
        handleSceneLoadError("MainHallScene", error);
      }
    }
  });

  return entity;
}
