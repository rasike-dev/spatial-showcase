import { SessionMode, World } from "@iwsdk/core";

import { startSpatialShowcase } from "./app/startSpatialShowcase.js";

const assets = {}; // no demo assets now

World.create(document.getElementById("scene-container"), {
  assets,
  xr: {
    sessionMode: SessionMode.ImmersiveVR,
    offer: "always",
    features: {
      handTracking: false,
      layers: true
    }
  },
  features: {
    locomotion: { useWorker: true },
    grabbing: false,
    physics: false,
    sceneUnderstanding: false
  }
}).then((world) => {
  // Launch your custom application
  startSpatialShowcase(world);
});
