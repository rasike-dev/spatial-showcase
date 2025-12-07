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
 * @param {Function} customOnClick - Optional custom click handler (overrides default)
 * @returns {Entity} The created back button entity
 */
export function createBackButton(world, sceneManager, entities, customOnClick = null) {
  const entity = world.createTransformEntity().addComponent(PanelUI, {
    config: PORTAL.PANEL.configPath,
    maxWidth: 1.0, // Smaller width for better visibility
    maxHeight: 0.4 // Smaller height for better visibility
  });

  // Position back button centered, in front of user (same Z as panels)
  // Positioned at x=0, y=1.0 (top) to stack above forward button
  entity.object3D.position.set(0, 1.0, -2.5);
  entity.object3D.lookAt(0, 1.6, 0);

  entities.push(entity);

  // Track if back button navigation is in progress
  let isNavigating = false;

  bindPanelButton(entity, {
    label: UI_TEXT.BACK_BUTTON_LABEL,
    onClick: async (event) => {
      logger.info("[BackButton] Back button clicked", { event, isNavigating, hasCustomHandler: !!customOnClick });

      if (isNavigating) {
        logger.warn("[BackButton] Navigation already in progress, ignoring click");
        return;
      }

      // Use custom handler if provided
      if (customOnClick) {
        logger.info("[BackButton] Using custom onClick handler");
        isNavigating = true;
        try {
          await customOnClick(event);
        } catch (error) {
          logger.error("[BackButton] Error in custom onClick handler:", error);
        } finally {
          setTimeout(() => {
            isNavigating = false;
          }, 2000);
        }
        return;
      }

      // Default: Navigate to Main Hall
      isNavigating = true;
      logger.info("[BackButton] Starting navigation to Main Hall");

      try {
        const module = await safeDynamicImport(
          () => import("../scenes/MainHallScene.js"),
          "MainHallScene"
        );
        if (!module?.MainHallScene) {
          logger.warn('[BackButton] "MainHallScene" export not found.');
          isNavigating = false;
          return;
        }
        logger.info("[BackButton] Loading MainHallScene");
        
        // Pass portfolio data if available
        const portfolioData = world.portfolioData;
        sceneManager.loadScene(module.MainHallScene, {
          portfolioData: portfolioData
        });
        
        // Reset after delay
        setTimeout(() => {
          isNavigating = false;
        }, 2000);
      } catch (error) {
        logger.error("[BackButton] Error loading MainHallScene:", error);
        handleSceneLoadError("MainHallScene", error);
        isNavigating = false;
      }
    }
  });

  return entity;
}
