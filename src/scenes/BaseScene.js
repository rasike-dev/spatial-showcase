import { CAMERA } from "../constants/sceneConstants.js";
import { getSceneLoader } from "./sceneRegistry.js";
import { logger } from "../utils/logger.js";
import { safeDynamicImport, handleSceneLoadError } from "../utils/errorHandler.js";

/**
 * Base class providing common scene utilities such as camera setup and entity tracking.
 */
export class BaseScene {
  /**
   * @param {import("@iwsdk/core").World} world - IWSDK world instance
   * @param {import("../systems/SceneManager.js").SceneManager} sceneManager - scene manager controlling transitions
   */
  constructor(world, sceneManager) {
    this.world = world;
    this.sceneManager = sceneManager;
    this.entities = [];
  }

  /**
   * Positions the camera using the provided coordinates (defaults to the global camera position).
   * @param {{ x: number, y: number, z: number }} position
   */
  setupCamera(position = CAMERA.DEFAULT_POSITION) {
    const { camera } = this.world;
    camera.position.set(position.x, position.y, position.z);
  }

  /**
   * Tracks a newly created entity so it can be disposed automatically.
   * @param {Entity} entity
   * @returns {Entity}
   */
  trackEntity(entity) {
    this.entities.push(entity);
    return entity;
  }

  /**
   * Destroys all tracked entities and resets the internal list.
   */
  dispose() {
    this.entities.forEach((entity) => {
      this.world.destroyEntity(entity);
    });
    this.entities = [];
  }

  /**
   * Loads another scene by ID using the shared scene registry.
   * @param {string} targetSceneId
   */
  async navigateToScene(targetSceneId) {
    const loader = getSceneLoader(targetSceneId);
    if (!loader) {
      logger.warn(`[SceneNavigation] No loader registered for "${targetSceneId}"`);
      return;
    }
    logger.info(`[SceneNavigation] Transition -> ${targetSceneId}`);
    try {
      const SceneClass = await safeDynamicImport(loader, `scene "${targetSceneId}"`);
      if (!SceneClass) {
        logger.warn(`[SceneNavigation] Loader for "${targetSceneId}" returned empty module`);
        return;
      }
      this.sceneManager.loadScene(SceneClass);
    } catch (error) {
      handleSceneLoadError(targetSceneId, error);
    }
  }
}
