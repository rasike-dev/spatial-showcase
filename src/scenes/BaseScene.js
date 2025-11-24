import { CAMERA } from "../constants/sceneConstants.js";

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
}
