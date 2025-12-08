import { SessionMode, World } from "@iwsdk/core";

import { startSpatialShowcase } from "./app/startSpatialShowcase.js";
import { logger } from "./utils/logger.js";
import { setupIWSDKErrorHandling } from "./utils/IWSDKErrorHandler.js";

// Initialize IWSDK error handling BEFORE creating World
// This suppresses the known WebGL renderer bug in IWSDK 0.2.0
setupIWSDKErrorHandling();

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
// Note: IWSDK error handler should suppress known WebGL errors before this runs
window.addEventListener("error", (event) => {
  const error = event.error;
  const message = error?.message || event.message;
  
  // Skip logging if this is the known IWSDK WebGL bug (should be suppressed by IWSDKErrorHandler)
  if (message && (
    message.includes('Cannot read properties of undefined (reading \'test\')') ||
    (message.includes('projectObject') && message.includes('@iwsdk'))
  )) {
    // This error should already be suppressed by IWSDKErrorHandler
    // Only log if suppression didn't work (for debugging)
    if (!window._iwsdkErrorSuppressed) {
      logger.warn("[GlobalError] IWSDK WebGL error detected but not suppressed - check IWSDKErrorHandler");
    }
    return; // Don't log this error
  }
  
  // Log all other errors normally
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
