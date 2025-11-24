import { PanelUI } from "@iwsdk/core";
import { bindPanelButton } from "../utils/panelBindings.js";
import { CAMERA, PORTAL, MAIN_HALL_PORTALS } from "../constants/sceneConstants.js";
import { logger } from "../utils/logger.js";
import { safeDynamicImport, handleSceneLoadError } from "../utils/errorHandler.js";
import { BaseScene } from "./BaseScene.js";

/**
 * Lazy loaders for each secondary scene.
 */
const SCENE_LOADERS = {
  ArtGalleryScene: () => import("./ArtGalleryScene.js").then((module) => module.ArtGalleryScene),
  ProjectsScene: () => import("./ProjectsScene.js").then((module) => module.ProjectsScene),
  PhotoScene: () => import("./PhotoScene.js").then((module) => module.PhotoScene),
  AboutScene: () => import("./AboutScene.js").then((module) => module.AboutScene),
  ContactScene: () => import("./ContactScene.js").then((module) => module.ContactScene)
};

/**
 * Main hall scene that acts as the navigation hub for all other scenes.
 */
export class MainHallScene extends BaseScene {
  constructor(world, sceneManager) {
    super(world, sceneManager);
  }

  /**
   * Lifecycle hook invoked by the scene manager to set up entities.
   */
  init() {
    // Set camera position on entering scene
    this.setupCamera();

    logger.info("MainHallScene: Initializing portals...");

    // Create portals spaced horizontally
    this.createPortal("AI Art Gallery", MAIN_HALL_PORTALS.POSITIONS.ART_GALLERY, "ArtGalleryScene");
    this.createPortal("Projects", MAIN_HALL_PORTALS.POSITIONS.PROJECTS, "ProjectsScene");
    this.createPortal("Photography", MAIN_HALL_PORTALS.POSITIONS.PHOTOGRAPHY, "PhotoScene");
    this.createPortal("About", MAIN_HALL_PORTALS.POSITIONS.ABOUT, "AboutScene");
    this.createPortal("Contact", MAIN_HALL_PORTALS.POSITIONS.CONTACT, "ContactScene");

    logger.info(`MainHallScene: Created ${this.entities.length} portal entities`);
  }

  /**
   * Creates a single portal button that loads the specified scene.
   * @param {string} label - Text displayed on the portal UI
   * @param {number} xOffset - Horizontal placement of the portal
   * @param {string} targetSceneName - Key of the target scene to load
   */
  createPortal(label, xOffset, targetSceneName) {
    logger.debug(`Creating portal: ${label} at x=${xOffset}`);

    const entity = this.world.createTransformEntity().addComponent(PanelUI, {
      config: PORTAL.PANEL.configPath,
      maxWidth: PORTAL.PANEL.maxWidth,
      maxHeight: PORTAL.PANEL.maxHeight
    });

    entity.object3D.position.set(xOffset, PORTAL.DEFAULT_Y_POSITION, PORTAL.PORTAL_Z);
    // Make panel face the camera (look at origin)
    entity.object3D.lookAt(
      CAMERA.DEFAULT_POSITION.x,
      CAMERA.DEFAULT_POSITION.y,
      CAMERA.DEFAULT_POSITION.z
    );
    logger.debug(`Portal "${label}" positioned at:`, entity.object3D.position);

    this.trackEntity(entity);
    bindPanelButton(entity, {
      label,
      onClick: () => this.loadSceneByName(targetSceneName)
    });
  }

  /**
   * Dynamically imports and loads a scene by its registry key.
   * @param {string} targetSceneName
   */
  async loadSceneByName(targetSceneName) {
    logger.info(`Portal clicked -> ${targetSceneName}`);
    const loader = SCENE_LOADERS[targetSceneName];
    if (!loader) {
      logger.warn(`No loader registered for scene "${targetSceneName}"`);
      return;
    }
    try {
      const TargetScene = await safeDynamicImport(loader, `scene "${targetSceneName}"`);
      if (!TargetScene) {
        logger.warn(`Scene module "${targetSceneName}" did not export the class.`);
        return;
      }
      this.sceneManager.loadScene(TargetScene);
    } catch (error) {
      handleSceneLoadError(targetSceneName, error);
    }
  }
}
