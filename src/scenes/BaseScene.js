import { CAMERA } from "../constants/sceneConstants.js";
import { getSceneLoader } from "./sceneRegistry.js";
import { logger } from "../utils/logger.js";
import { safeDynamicImport, handleSceneLoadError } from "../utils/errorHandler.js";
import { stopSlideshow } from "../utils/slideshow.js";

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
   * Ensures the entity's object3D is added to the world scene to avoid parenting warnings.
   * @param {Entity} entity
   * @returns {Entity}
   */
  trackEntity(entity) {
    // IWSDK automatically handles entity parenting to the active level root
    // The parenting warnings are informational and expected behavior
    this.entities.push(entity);
    return entity;
  }

  /**
   * Destroys all tracked entities and resets the internal list.
   */
  dispose() {
    logger.debug(`[BaseScene] Disposing scene with ${this.entities.length} entities`);

    this.entities.forEach((entity, index) => {
      const entityName = entity.constructor?.name || `Entity${index}`;
      logger.debug(`[BaseScene] Disposing entity ${index}: ${entityName}`);

      // Clean up slideshows before destroying entity (if any)
      if (entity.object3D) {
        stopSlideshow(entity);
      }

      // Remove object3D from scene - this is the primary cleanup method in IWSDK
      if (entity.object3D) {
        if (entity.object3D.parent) {
          logger.debug(`[BaseScene] Removing entity ${index} from parent`);
          entity.object3D.parent.remove(entity.object3D);
        }

        // More aggressive cleanup - try to remove from world scene directly
        if (this.world?.scene?.remove) {
          try {
            this.world.scene.remove(entity.object3D);
          } catch (e) {
            // Entity might already be removed, which is fine
            logger.debug(`[BaseScene] Could not remove entity ${index} from world scene: ${e.message}`);
          }
        }

        // Dispose of Three.js resources (geometries and materials)
        entity.object3D.traverse((object) => {
          if (object.isMesh) {
            if (object.geometry) {
              object.geometry.dispose();
            }
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach((material) => material.dispose());
              } else {
                object.material.dispose();
              }
            }
          }
        });

        // Note: We don't set object3D to null here as it might be accessed
        // during the disposal process. Let garbage collection handle it.
      }

      // Try to destroy the entity itself if it has a destroy method
      if (typeof entity.destroy === "function") {
        try {
          entity.destroy();
        } catch (e) {
          logger.warn(`[BaseScene] Error destroying entity ${index}: ${e.message}`);
        }
      }
    });

    this.entities = [];
    logger.debug("[BaseScene] Scene disposal complete");
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
