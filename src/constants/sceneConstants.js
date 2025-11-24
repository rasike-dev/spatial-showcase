/**
 * Scene constants used throughout the spatial showcase application.
 * Centralizes magic numbers and configuration values for easier maintenance.
 */

/**
 * Camera configuration constants
 */
export const CAMERA = {
  /** Default eye height in meters (typical VR user height) */
  DEFAULT_HEIGHT: 1.6,
  /** Default camera position */
  DEFAULT_POSITION: { x: 0, y: 1.6, z: 0 },
  /** Field of view in degrees */
  FOV: 70,
  /** Near clipping plane */
  NEAR: 0.1,
  /** Far clipping plane */
  FAR: 100
};

/**
 * Portal and navigation button configuration
 */
export const PORTAL = {
  /** Y position for portals and back buttons */
  DEFAULT_Y_POSITION: 1.4,
  /** Z position for back buttons (behind camera) */
  BACK_BUTTON_Z: 2,
  /** Z position for portals (in front of camera) */
  PORTAL_Z: -2,
  /** Horizontal spacing between portals in main hall */
  SPACING: 1.2,
  /** Panel configuration for portals and back buttons */
  PANEL: {
    maxWidth: 1.1,
    maxHeight: 0.45,
    configPath: "/ui/portalPanel.json"
  }
};

/**
 * Main hall portal positions
 */
export const MAIN_HALL_PORTALS = {
  /** Portal positions along X-axis */
  POSITIONS: {
    ART_GALLERY: 0,
    PROJECTS: 1.2,
    PHOTOGRAPHY: -1.2,
    ABOUT: 2.4,
    CONTACT: -2.4
  }
};

/**
 * Gallery layout configuration
 */
export const GALLERY = {
  /** Art gallery configuration */
  ART: {
    radius: 3,
    spacing: 1.5,
    panel: {
      maxWidth: 1.5,
      maxHeight: 2.0
    }
  },
  /** Photo gallery configuration */
  PHOTO: {
    radius: 3,
    spacing: 1.5,
    panel: {
      maxWidth: 1.5,
      maxHeight: 2.0
    }
  },
  /** Projects gallery configuration */
  PROJECTS: {
    radius: 3.5,
    spacing: 1.8,
    panel: {
      maxWidth: 1.8,
      maxHeight: 2.2
    }
  }
};

/**
 * Content panel configuration (About, Contact, etc.)
 */
export const CONTENT_PANEL = {
  maxWidth: 2.5,
  maxHeight: 3.0,
  /** Y position for content panels */
  Y_POSITION: 1.6,
  /** Z position for content panels (in front of camera) */
  Z_POSITION: -2
};

/**
 * Lighting configuration
 */
export const LIGHTING = {
  /** Hemisphere light sky color */
  SKY_COLOR: 0xffffff,
  /** Hemisphere light ground color */
  GROUND_COLOR: 0x444444,
  /** Hemisphere light intensity */
  INTENSITY: 1.0
};

/**
 * UI text constants
 */
export const UI_TEXT = {
  BACK_BUTTON_LABEL: "← Back to Main Hall"
};
