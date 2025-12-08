import { logger } from '../utils/logger.js';
import { endSession } from '../utils/analytics.js';

/**
 * Coordinates scene lifecycle: creation, initialization, and disposal.
 */
export class SceneManager {
  /**
   * @param {import("@iwsdk/core").World} world
   */
  constructor(world) {
    this.world = world;
    this.activeScene = null;
    this.isLoading = false; // Lock to prevent concurrent scene loads
  }

  /**
   * Replaces the current scene with a new one and calls its init hook.
   * @param {typeof import("../scenes/BaseScene.js").BaseScene} SceneClass
   * @param {unknown} data
   */
  loadScene(SceneClass, data = null) {
    const sceneName = SceneClass.name || "UnknownScene";

    // Prevent concurrent scene loads
    if (this.isLoading) {
      console.warn(`[SceneManager] Scene load already in progress, ignoring request for: ${sceneName}`);
      return;
    }

    console.log(`[SceneManager] Loading scene: ${sceneName}`);
    this.isLoading = true;

    // Dispose existing scene with enhanced logging
    if (this.activeScene) {
      const oldSceneName = this.activeScene.constructor.name || "UnknownScene";
      console.log(`[SceneManager] Disposing previous scene: ${oldSceneName}`);

      if (this.activeScene.dispose) {
        this.activeScene.dispose();
      }

      // Force cleanup - wait a frame for disposal to complete
      this.activeScene = null;

      // Wait for next frame to ensure cleanup is complete
      requestAnimationFrame(async () => {
        await this._createNewScene(SceneClass, data, sceneName);
      });
    } else {
      // No previous scene, create immediately
      this._createNewScene(SceneClass, data, sceneName).catch(error => {
        console.error(`[SceneManager] Error creating scene:`, error);
        logger.error(`[SceneManager] Error creating scene:`, error);
        this.isLoading = false; // Release lock even on error
      });
    }
  }

  async _createNewScene(SceneClass, data, sceneName) {
    console.log(`[SceneManager] Creating new scene: ${sceneName}`);

    // End previous session if switching scenes
    if (this.activeScene && window.portfolioId) {
      endSession(window.portfolioId);
    }

    // Create new scene
    this.activeScene = new SceneClass(this.world, this);

    // Initialize scene with data (handle async init if needed)
    if (this.activeScene.init) {
      try {
        const initResult = this.activeScene.init(data || {});
        // If init returns a promise, wait for it to complete
        if (initResult && typeof initResult.then === 'function') {
          await initResult;
          console.log(`[SceneManager] Scene async initialization completed: ${sceneName}`);
        } else {
          console.log(`[SceneManager] Scene synchronous initialization completed: ${sceneName}`);
        }
      } catch (error) {
        console.error(`[SceneManager] Error during scene initialization:`, error);
        logger.error(`[SceneManager] Error during scene initialization:`, error);
        // Continue even if initialization fails
      }
    }

    console.log(`[SceneManager] Scene initialized: ${sceneName}`);

    // Reset loading lock after initialization completes
    this.isLoading = false;
    console.log(`[SceneManager] Loading lock released for: ${sceneName}`);
  }
}
