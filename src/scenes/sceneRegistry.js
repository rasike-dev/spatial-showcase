export const SCENE_IDS = {
  MAIN_HALL: "main_hall",
  GALLERY: "gallery",
  INNOVATION_LAB: "innovation_lab",
  IMPACT_ANALYZER: "impact_analyzer",
  CREATOR_FORGE: "creator_forge",
  CONTACT_PORTAL: "contact_portal"
};

const SCENE_LOADERS = {
  [SCENE_IDS.MAIN_HALL]: () => import("./MainHallScene.js").then((module) => module.MainHallScene),
  [SCENE_IDS.GALLERY]: () => import("./GalleryScene.js").then((module) => module.GalleryScene),
  [SCENE_IDS.INNOVATION_LAB]: () =>
    import("./InnovationLabScene.js").then((module) => module.InnovationLabScene),
  [SCENE_IDS.IMPACT_ANALYZER]: () =>
    import("./ImpactAnalyzerScene.js").then((module) => module.ImpactAnalyzerScene),
  [SCENE_IDS.CREATOR_FORGE]: () =>
    import("./CreatorForgeScene.js").then((module) => module.CreatorForgeScene),
  [SCENE_IDS.CONTACT_PORTAL]: () =>
    import("./ContactPortalScene.js").then((module) => module.ContactPortalScene)
};

export function getSceneLoader(sceneId) {
  return SCENE_LOADERS[sceneId];
}


