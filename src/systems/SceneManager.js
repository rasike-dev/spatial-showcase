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
  }

  /**
   * Replaces the current scene with a new one and calls its init hook.
   * @param {typeof import("../scenes/BaseScene.js").BaseScene} SceneClass
   * @param {unknown} data
   */
  loadScene(SceneClass, data = null) {
    // Dispose existing scene
    if (this.activeScene && this.activeScene.dispose) {
      this.activeScene.dispose();
    }

    // Create new scene
    this.activeScene = new SceneClass(this.world, this, data);

    // Initialize scene
    if (this.activeScene.init) {
      this.activeScene.init();
    }
  }
}
