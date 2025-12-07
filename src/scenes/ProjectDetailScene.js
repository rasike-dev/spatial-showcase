import { PanelUI } from "@iwsdk/core";
import { bindPanelContent } from "../utils/panelContent.js";
import { bindPanelButton } from "../utils/panelBindings.js";
import { CAMERA } from "../constants/sceneConstants.js";
import { logger } from "../utils/logger.js";
import { BaseScene } from "./BaseScene.js";
import { createBackButton } from "../components/BackButton.js";
import { trackEvent } from "../utils/api.js";
import { MainHallScene } from "./MainHallScene.js";

/**
 * Scene that displays detailed view of a single project with all its media
 */
export class ProjectDetailScene extends BaseScene {
  constructor(world, sceneManager) {
    super(world, sceneManager);
    this.projectData = null;
  }

  /**
   * Initialize the project detail scene
   * @param {Object} options - Scene options
   * @param {Object} options.project - Project data with media
   */
  init(options = {}) {
    this.setupCamera();
    
    // Get project data from options or world
    this.projectData = options?.project || this.world.currentProject;
    
    if (!this.projectData) {
      logger.error("[ProjectDetailScene] No project data provided");
      // Fallback to main hall
      this.navigateToScene("MainHallScene");
      return;
    }

    logger.info("[ProjectDetailScene] Initializing with project:", this.projectData.title);

    // Track project view
    if (window.portfolioId) {
      trackEvent(window.portfolioId, 'project_view', {
        project_id: this.projectData.id,
        project_title: this.projectData.title,
      });
    }

    // Create back button
    this.createBackButton();

    // Display project title and description
    this.createProjectHeader();

    // Display all media for this project
    this.createMediaGallery();
  }

  createBackButton() {
    createBackButton(this.world, this.sceneManager, this.entities, () => {
      // Navigate back to main hall
      this.navigateToScene("MainHallScene");
    });
  }

  createProjectHeader() {
    const entity = this.world.createTransformEntity().addComponent(PanelUI, {
      config: "/ui/projectPanel.json",
      maxWidth: 1.2,
      maxHeight: 0.8
    });

    entity.object3D.position.set(0, 2.0, -2.5);
    entity.object3D.lookAt(0, 1.6, 0);

    this.trackEntity(entity);

    // Bind project header content
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bindPanelContent(entity, {
          title: this.projectData.title,
          description: this.projectData.description || "No description available",
          image: null, // No image in header
        });
      });
    });
  }

  createMediaGallery() {
    const media = this.projectData.media || [];
    
    if (media.length === 0) {
      logger.warn("[ProjectDetailScene] No media found for project:", this.projectData.title);
      return;
    }

    logger.info(`[ProjectDetailScene] Creating gallery with ${media.length} media items`);

    // Arrange media in a grid or circle
    const radius = 2.5;
    const startAngle = -Math.PI / 2; // Start at top
    const angleStep = (Math.PI * 2) / Math.max(media.length, 1);

    media.forEach((mediaItem, index) => {
      const angle = startAngle + (index * angleStep);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 1.6; // Eye level

      const entity = this.world.createTransformEntity().addComponent(PanelUI, {
        config: "/ui/projectPanel.json",
        maxWidth: 1.0,
        maxHeight: 1.0
      });

      entity.object3D.position.set(x, y, z);
      entity.object3D.lookAt(0, 1.6, 0);

      this.trackEntity(entity);

      // Bind media content
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const isVideo = mediaItem.type === 'video';
          bindPanelContent(entity, {
            title: mediaItem.filename || `Media ${index + 1}`,
            description: isVideo ? "Click to play video" : "",
            image: isVideo ? null : mediaItem.url,
            video: isVideo ? mediaItem.url : null,
            media: [mediaItem],
            panelId: mediaItem.id,
            portfolioId: window.portfolioId,
          });
        });
      });
    });
  }

  navigateToScene(sceneName) {
    logger.info(`[ProjectDetailScene] Navigating to: ${sceneName}`);
    
    // Store portfolio data for main hall
    const portfolioData = this.world.portfolioData;
    
    // MainHallScene is already imported, so use it directly
    if (sceneName === "MainHallScene" || sceneName === "main_hall") {
      this.sceneManager.loadScene(MainHallScene, {
        portfolioData: portfolioData
      });
    } else {
      // For other scenes, use BaseScene's navigateToScene
      super.navigateToScene(sceneName, {
        portfolioData: portfolioData
      });
    }
  }

  dispose() {
    // Clean up
    this.projectData = null;
    super.dispose();
  }
}

