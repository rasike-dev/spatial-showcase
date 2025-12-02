import showcaseScenes from "./showcaseScenes.json" assert { type: "json" };

/**
 * Returns structured data for a scene by ID.
 * @param {string} sceneId
 */
export function getShowcaseScene(sceneId) {
  return showcaseScenes[sceneId] || null;
}

/**
 * Convenience helper to list portals/teleports for a scene.
 * @param {string} sceneId
 * @returns {Array}
 */
export function getTeleports(sceneId) {
  return getShowcaseScene(sceneId)?.teleports || [];
}

export const SHOWCASE_SCENE_IDS = Object.keys(showcaseScenes);


