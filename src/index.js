import { SessionMode, World } from "@iwsdk/core";

import { startSpatialShowcase } from "./app/startSpatialShowcase.js";
import { logger } from "./utils/logger.js";

// Immediate console log to verify script is loading
console.log('[VR App] Script loaded, URL:', window.location.href);
console.log('[VR App] Hash:', window.location.hash);
console.log('[VR App] Query params:', window.location.search);

// IMPORTANT: Store hash immediately before any redirects can happen
// This ensures we don't lose the token during HTTP->HTTPS redirect
if (window.location.hash) {
  const hash = window.location.hash;
  console.log('[VR App] Hash fragment detected on load:', hash);
  // Store in sessionStorage as backup
  sessionStorage.setItem('pendingShareToken', hash);
  console.log('[VR App] Hash stored in sessionStorage as backup');
}

// Global error handling for debugging
window.addEventListener("error", (event) => {
  logger.error("[GlobalError]", {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
    target: event.target,
    type: event.type
  });
});

// Handle unhandled promise rejections
window.addEventListener("unhandledrejection", (event) => {
  logger.error("[UnhandledRejection]", event.reason);
});

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
