import { SceneManager } from "../systems/SceneManager.js";
import { MainHallScene } from "../scenes/MainHallScene.js";

export function startSpatialShowcase(world) {
  const sceneManager = new SceneManager(world);

  // Load the first scene (Main Hall)
  sceneManager.loadScene(MainHallScene);
}
