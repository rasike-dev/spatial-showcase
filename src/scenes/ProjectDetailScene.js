import { PanelUI, PanelDocument } from "@iwsdk/core";
import { bindPanelContent } from "../utils/panelContent.js";
import { bindPanelButton } from "../utils/panelBindings.js";
import { CAMERA } from "../constants/sceneConstants.js";
import { logger } from "../utils/logger.js";
import { BaseScene } from "./BaseScene.js";
import { createBackButton } from "../components/BackButton.js";
import { trackEvent } from "../utils/api.js";
import { MainHallScene } from "./MainHallScene.js";
import { getTemplateLayout, calculatePanelPositions } from "../utils/templateRenderer.js";
import { SimplePanelEntityManager } from "../utils/SimplePanelEntityManager.js";

/**
 * Scene that displays detailed view of a single project with all its media
 */
export class ProjectDetailScene extends BaseScene {
  constructor(world, sceneManager) {
    super(world, sceneManager);
    this.projectData = null;
    this.panelEntityManager = new SimplePanelEntityManager(world);
    this.isInitializing = false;
  }

  /**
   * Initialize the project room scene (one project = one room/level)
   * @param {Object} options - Scene options
   * @param {Object} options.projectData - Project data with media (one room/level)
   * @param {Object} options.project - Alternative name for projectData
   */
  init(options = {}) {
    this.setupCamera();
    
    // Get project data from options (support both projectData and project names)
    this.projectData = options?.projectData || options?.project || this.world.currentProject;
    
    if (!this.projectData) {
      logger.error("[ProjectDetailScene] No project data provided");
      // Fallback to main hall
      this.navigateToScene("MainHallScene");
      return;
    }

    logger.info("[ProjectDetailScene] Initializing project room:", this.projectData.title);
    logger.info("[ProjectDetailScene] Project data:", {
      id: this.projectData.id,
      title: this.projectData.title,
      mediaCount: this.projectData.media?.length || 0,
      media: this.projectData.media
    });
    console.log("[ProjectDetailScene] ========== PROJECT ROOM INIT ==========");
    console.log("[ProjectDetailScene] Project ID:", this.projectData.id);
    console.log("[ProjectDetailScene] Project Title:", this.projectData.title);
    console.log("[ProjectDetailScene] Project data keys:", Object.keys(this.projectData));
    console.log("[ProjectDetailScene] Media items:", this.projectData.media?.length || 0);
    console.log("[ProjectDetailScene] Media details:", this.projectData.media);
    
    // If no media, try to get it from world.portfolioData
    if (!this.projectData.media || this.projectData.media.length === 0) {
      logger.warn("[ProjectDetailScene] Project has no media items in projectData!");
      console.warn("[ProjectDetailScene] ⚠️ No media items found for project:", this.projectData.title);
      console.warn("[ProjectDetailScene] Attempting to find media in world.portfolioData...");
      
      // Try to find project in portfolioData
      if (this.world.portfolioData?.projects) {
        const projectWithMedia = this.world.portfolioData.projects.find(p => p.id === this.projectData.id);
        if (projectWithMedia && projectWithMedia.media && projectWithMedia.media.length > 0) {
          console.log("[ProjectDetailScene] ✅ Found project with media in portfolioData:", {
            id: projectWithMedia.id,
            title: projectWithMedia.title,
            mediaCount: projectWithMedia.media.length
          });
          this.projectData.media = projectWithMedia.media;
          // Merge all project data to ensure we have everything
          this.projectData = { ...this.projectData, ...projectWithMedia };
        } else {
          console.warn("[ProjectDetailScene] ❌ Project not found in portfolioData or has no media");
        }
      }
      
      // Final check
      if (!this.projectData.media || this.projectData.media.length === 0) {
        logger.error("[ProjectDetailScene] Project has no media items after all attempts!");
        console.error("[ProjectDetailScene] ❌ Cannot create gallery - no media available!");
        return;
      }
    }

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

    // Display navigation to other project levels (if any)
    this.createLevelNavigation();

    // Display all media for this project (async - use same layout system as MainHallScene)
    this.createMediaGallery().catch(error => {
      logger.error("[ProjectDetailScene] Error creating media gallery:", error);
      console.error("[ProjectDetailScene] ❌ Error creating media gallery:", error);
    });
  }

  createBackButton() {
    createBackButton(this.world, this.sceneManager, this.entities, () => {
      // Navigate back to main hall
      this.navigateToScene("MainHallScene");
    });
  }

  createProjectHeader() {
    // Make header panel smaller compared to media panels
    // Position it above the media panels to avoid overlapping
    const headerWidth = 0.8;  // Smaller width
    const headerHeight = 0.5; // Smaller height - compact header
    
    const entity = this.world.createTransformEntity().addComponent(PanelUI, {
      config: "/ui/projectPanel.json",
      maxWidth: headerWidth,
      maxHeight: headerHeight
    });

    // Position header above media panels (media panels are typically at y=1.6, z=-3.0)
    // Place header higher up and slightly closer to avoid overlap
    entity.object3D.position.set(0, 2.4, -2.2); // Higher Y, closer Z
    entity.object3D.lookAt(0, 1.6, 0);

    this.trackEntity(entity);

    // Bind project room header content with smaller font sizes
    setTimeout(() => {
      try {
        const document = PanelDocument.data.document[entity.index];
        if (!document) {
          // Retry if document not ready
          setTimeout(() => this.bindHeaderContent(entity, headerWidth, headerHeight), 200);
          return;
        }
        
        this.bindHeaderContent(entity, headerWidth, headerHeight);
      } catch (error) {
        logger.error("[ProjectDetailScene] Error binding header content:", error);
        console.error("[ProjectDetailScene] ❌ Error binding header content:", error);
      }
    }, 300);
  }

  /**
   * Bind header content with proper text wrapping and smaller font sizes
   * Uses the same retry mechanism as bindPanelContent for UIKitML compatibility
   * @private
   */
  bindHeaderContent(entity, panelWidth, panelHeight, maxAttempts = 200) {
    const attemptBinding = (attempt = 0) => {
      try {
        // Check if entity.index is valid
        if (entity.index === undefined || entity.index === null) {
          if (attempt < maxAttempts) {
            requestAnimationFrame(() => attemptBinding(attempt + 1));
          } else {
            logger.warn(`[ProjectDetailScene] Entity index not available after ${maxAttempts} attempts`);
          }
          return;
        }

        const document = PanelDocument.data.document[entity.index];
        if (!document) {
          if (attempt < maxAttempts) {
            requestAnimationFrame(() => attemptBinding(attempt + 1));
          } else {
            logger.warn(`[ProjectDetailScene] Document not ready for entity ${entity.index} after ${maxAttempts} attempts`);
          }
          return;
        }

        // Add a small delay to ensure UIKitML has fully rendered
        if (attempt === 0) {
          setTimeout(() => {
            attemptBinding(attempt + 1);
          }, 100);
          return;
        }

        console.log("[ProjectDetailScene] ========== BINDING HEADER CONTENT ==========");
        console.log("[ProjectDetailScene] Entity index:", entity.index);
        console.log("[ProjectDetailScene] Document available:", !!document);
        console.log("[ProjectDetailScene] Attempt:", attempt);

        // Get title and description elements (try multiple methods like bindPanelContent)
        let titleElement = null;
        if (document.getElementById) {
          titleElement = document.getElementById("panel-title");
        }
        if (!titleElement && document.querySelector) {
          titleElement = document.querySelector("#panel-title");
        }
        if (!titleElement && document.querySelector) {
          titleElement = document.querySelector(".project-title");
        }

        let descElement = null;
        if (document.getElementById) {
          descElement = document.getElementById("panel-description");
        }
        if (!descElement && document.querySelector) {
          descElement = document.querySelector("#panel-description");
        }
        if (!descElement && document.querySelector) {
          descElement = document.querySelector(".project-description");
        }

        const imageElement = document.getElementById("panel-image");
        const videoElement = document.getElementById("panel-video");

        // Hide image/video for header (text only)
        if (imageElement && imageElement.style) {
          try {
            imageElement.style.display = "none";
          } catch (e) {
            logger.warn("[ProjectDetailScene] Could not hide image element:", e);
          }
        }
        if (videoElement && videoElement.style) {
          try {
            videoElement.style.display = "none";
          } catch (e) {
            logger.warn("[ProjectDetailScene] Could not hide video element:", e);
          }
        }

        // Set title - only user-provided title
        if (titleElement) {
          const title = this.projectData.title || "Project Room";
          console.log("[ProjectDetailScene] Setting title:", title);
          console.log("[ProjectDetailScene] Title element found:", {
            id: titleElement.id,
            tagName: titleElement.tagName,
            hasSetProperties: !!titleElement.setProperties,
            hasTextContent: titleElement.textContent !== undefined
          });

          let titleSet = false;

          // Method 1: UIKitML setProperties (preferred)
          if (titleElement.setProperties) {
            try {
              titleElement.setProperties({ text: title });
              titleSet = true;
              logger.info(`[ProjectDetailScene] ✅ Title set via setProperties: "${title}"`);
              console.log(`[ProjectDetailScene] ✅ Title setProperties called`);
            } catch (e) {
              logger.warn(`[ProjectDetailScene] setProperties failed:`, e);
            }
          }

          // Method 2: textContent
          if (titleElement.textContent !== undefined) {
            try {
              titleElement.textContent = title;
              if (titleElement.textContent === title || titleElement.textContent.includes(title)) {
                titleSet = true;
                logger.info(`[ProjectDetailScene] ✅ Title set via textContent: "${title}"`);
                console.log(`[ProjectDetailScene] ✅ Title textContent set`);
              }
            } catch (e) {
              logger.warn(`[ProjectDetailScene] textContent failed:`, e);
            }
          }

          // Method 3: innerText
          if (titleElement.innerText !== undefined) {
            try {
              titleElement.innerText = title;
              if (titleElement.innerText === title || titleElement.innerText.includes(title)) {
                titleSet = true;
                logger.info(`[ProjectDetailScene] ✅ Title set via innerText: "${title}"`);
                console.log(`[ProjectDetailScene] ✅ Title innerText set`);
              }
            } catch (e) {
              logger.warn(`[ProjectDetailScene] innerText failed:`, e);
            }
          }

          // Method 4: innerHTML as fallback
          if (!titleSet && titleElement.innerHTML !== undefined) {
            try {
              titleElement.innerHTML = title;
              titleSet = true;
              logger.info(`[ProjectDetailScene] ✅ Title set via innerHTML: "${title}"`);
            } catch (e) {
              logger.warn(`[ProjectDetailScene] innerHTML failed:`, e);
            }
          }

          // Apply smaller font size and text wrapping
          const fontSize = Math.max(1.2, panelWidth * 1.5);
          if (titleElement.setProperties) {
            try {
              titleElement.setProperties({ fontSize: fontSize });
            } catch (e) {
              if (titleElement.style) {
                titleElement.style.fontSize = `${fontSize}px`;
              }
            }
          } else if (titleElement.style) {
            titleElement.style.fontSize = `${fontSize}px`;
          }

          if (titleElement.style) {
            titleElement.style.wordWrap = "break-word";
            titleElement.style.overflowWrap = "break-word";
            titleElement.style.whiteSpace = "normal";
            titleElement.style.maxWidth = "100%";
          }

          if (!titleSet) {
            logger.warn(`[ProjectDetailScene] ⚠️ Could not set title text after all methods`);
            // Retry if not set
            if (attempt < maxAttempts) {
              requestAnimationFrame(() => attemptBinding(attempt + 1));
              return;
            }
          }
        } else {
          logger.warn(`[ProjectDetailScene] ❌ Title element not found (attempt ${attempt})`);
          if (attempt < maxAttempts) {
            requestAnimationFrame(() => attemptBinding(attempt + 1));
            return;
          }
        }

        // Set description - only user-provided description (no media count)
        if (descElement) {
          const description = this.projectData.description || "";
          console.log("[ProjectDetailScene] Setting description:", description.substring(0, 50) + "...");
          
          let descSet = false;

          // Method 1: UIKitML setProperties (preferred)
          if (descElement.setProperties) {
            try {
              descElement.setProperties({ text: description });
              descSet = true;
              logger.info(`[ProjectDetailScene] ✅ Description set via setProperties`);
              console.log(`[ProjectDetailScene] ✅ Description setProperties called`);
            } catch (e) {
              logger.warn(`[ProjectDetailScene] setProperties failed:`, e);
            }
          }

          // Method 2: textContent
          if (descElement.textContent !== undefined) {
            try {
              descElement.textContent = description;
              if (descElement.textContent === description || descElement.textContent.includes(description)) {
                descSet = true;
                logger.info(`[ProjectDetailScene] ✅ Description set via textContent`);
                console.log(`[ProjectDetailScene] ✅ Description textContent set`);
              }
            } catch (e) {
              logger.warn(`[ProjectDetailScene] textContent failed:`, e);
            }
          }

          // Method 3: innerText
          if (descElement.innerText !== undefined) {
            try {
              descElement.innerText = description;
              if (descElement.innerText === description || descElement.innerText.includes(description)) {
                descSet = true;
                logger.info(`[ProjectDetailScene] ✅ Description set via innerText`);
                console.log(`[ProjectDetailScene] ✅ Description innerText set`);
              }
            } catch (e) {
              logger.warn(`[ProjectDetailScene] innerText failed:`, e);
            }
          }

          // Method 4: innerHTML as fallback
          if (!descSet && descElement.innerHTML !== undefined) {
            try {
              descElement.innerHTML = description;
              descSet = true;
              logger.info(`[ProjectDetailScene] ✅ Description set via innerHTML`);
            } catch (e) {
              logger.warn(`[ProjectDetailScene] innerHTML failed:`, e);
            }
          }

          // Apply smaller font size and text wrapping
          const fontSize = Math.max(1.0, panelWidth * 1.2);
          if (descElement.setProperties) {
            try {
              descElement.setProperties({ fontSize: fontSize });
            } catch (e) {
              if (descElement.style) {
                descElement.style.fontSize = `${fontSize}px`;
              }
            }
          } else if (descElement.style) {
            descElement.style.fontSize = `${fontSize}px`;
          }

          if (descElement.style) {
            descElement.style.wordWrap = "break-word";
            descElement.style.overflowWrap = "break-word";
            descElement.style.whiteSpace = "normal";
            descElement.style.maxWidth = "100%";
            descElement.style.lineHeight = "1.3";
          }

          if (!descSet && description) {
            logger.warn(`[ProjectDetailScene] ⚠️ Could not set description text after all methods`);
          }
        } else if (this.projectData.description) {
          logger.warn(`[ProjectDetailScene] ⚠️ Description element not found but description exists`);
          // Retry if description exists but element not found
          if (attempt < maxAttempts) {
            requestAnimationFrame(() => attemptBinding(attempt + 1));
            return;
          }
        }

        logger.info("[ProjectDetailScene] Header content binding completed");
        console.log("[ProjectDetailScene] ✅ Header content bound:", {
          title: this.projectData.title,
          description: this.projectData.description?.substring(0, 50) + "...",
          panelSize: `${panelWidth}x${panelHeight}`,
          titleElementFound: !!titleElement,
          descElementFound: !!descElement,
          attempt: attempt
        });
      } catch (error) {
        logger.error("[ProjectDetailScene] Error in bindHeaderContent:", error);
        console.error("[ProjectDetailScene] ❌ Error in bindHeaderContent:", error);
        // Retry on error
        if (attempt < maxAttempts) {
          requestAnimationFrame(() => attemptBinding(attempt + 1));
        }
      }
    };

    // Start the retry mechanism
    attemptBinding(0);
  }

  /**
   * Create navigation buttons to other project levels
   * This allows users to navigate between any number of project levels dynamically
   */
  createLevelNavigation() {
    // Get all projects from portfolio data
    const portfolioData = this.world.portfolioData;
    if (!portfolioData || !portfolioData.projects) {
      return; // No other projects to navigate to
    }

    // Get all projects except the current one
    const allProjects = portfolioData.projects || [];
    const otherProjects = allProjects.filter(p => p.id !== this.projectData?.id);
    
    if (otherProjects.length === 0) {
      return; // No other projects to navigate to
    }

    logger.info(`[ProjectDetailScene] Creating navigation to ${otherProjects.length} other project levels`);
    console.log(`[ProjectDetailScene] Creating navigation buttons for ${otherProjects.length} other levels`);

    // Position navigation buttons vertically, to the left side (opposite of main hall)
    const verticalSpacing = 0.6;
    const centerY = 0.9;
    const xOffset = -2.0; // Position to the left
    const offsetStart = otherProjects.length > 1 ? -((otherProjects.length - 1) * verticalSpacing) / 2 : 0;

    otherProjects.forEach((project, index) => {
      const yOffset = centerY + (offsetStart + index * verticalSpacing);
      
      const entity = this.world.createTransformEntity().addComponent(PanelUI, {
        config: "/ui/portalPanel.json",
        maxWidth: 0.9,
        maxHeight: 0.35
      });

      entity.object3D.position.set(xOffset, yOffset, -2.5);
      entity.object3D.lookAt(0, 1.6, 0);

      this.trackEntity(entity);

      // Create navigation button to project room
      bindPanelButton(entity, {
        label: project.title || `Level ${(project.order_index ?? 0) + 1}`,
        onClick: () => {
          logger.info(`[ProjectDetailScene] Navigating to project level: ${project.title}`);
          this.navigateToProjectLevel(project);
        }
      });

      logger.info(`[ProjectDetailScene] Navigation button created for: ${project.title}`);
    });
  }

  /**
   * Navigate to another project level
   * @param {Object} projectData - Project data for the level
   */
  navigateToProjectLevel(projectData) {
    if (!projectData) {
      logger.warn("[ProjectDetailScene] No project data provided for navigation");
      return;
    }

    logger.info(`[ProjectDetailScene] Navigating to project level: ${projectData.title}`);
    console.log(`[ProjectDetailScene] ========== NAVIGATING TO PROJECT LEVEL ==========`);
    console.log(`[ProjectDetailScene] Project data:`, {
      id: projectData.id,
      title: projectData.title,
      mediaCount: projectData.media?.length || 0,
      media: projectData.media
    });

    // Verify project has media - if not, try to get it from portfolioData
    if (!projectData.media || projectData.media.length === 0) {
      logger.warn(`[ProjectDetailScene] Project ${projectData.title} has no media items in projectData!`);
      console.warn(`[ProjectDetailScene] ⚠️ Project ${projectData.title} has no media items!`);
      
      // Try to find the project in portfolioData.projects with media
      if (this.world.portfolioData?.projects) {
        const projectWithMedia = this.world.portfolioData.projects.find(p => p.id === projectData.id);
        if (projectWithMedia && projectWithMedia.media && projectWithMedia.media.length > 0) {
          console.log(`[ProjectDetailScene] ✅ Found project with media in portfolioData:`, {
            id: projectWithMedia.id,
            title: projectWithMedia.title,
            mediaCount: projectWithMedia.media.length
          });
          projectData.media = projectWithMedia.media;
          projectData = { ...projectData, ...projectWithMedia }; // Merge to ensure all data is present
        } else {
          console.warn(`[ProjectDetailScene] ❌ Project not found in portfolioData.projects or has no media`);
        }
      }
    }

    // Import and load ProjectDetailScene (reuse the same scene class for all levels)
    import("./ProjectDetailScene.js").then((module) => {
      const ProjectDetailScene = module.ProjectDetailScene;
      if (ProjectDetailScene) {
        console.log(`[ProjectDetailScene] Loading ProjectDetailScene with project data:`, {
          id: projectData.id,
          title: projectData.title,
          mediaCount: projectData.media?.length || 0
        });
        this.sceneManager.loadScene(ProjectDetailScene, {
          projectData: projectData,
          project: projectData, // Support both names for compatibility
          portfolioData: this.world.portfolioData
        });
      } else {
        logger.error("[ProjectDetailScene] ProjectDetailScene class not found");
      }
    }).catch((error) => {
      logger.error("[ProjectDetailScene] Failed to load ProjectDetailScene:", error);
      console.error("[ProjectDetailScene] ❌ Failed to load ProjectDetailScene:", error);
    });
  }

  /**
   * Create media gallery using the same layout system as MainHallScene
   * This ensures consistent positioning, sizing, and loading across all project rooms
   */
  async createMediaGallery() {
    const media = this.projectData.media || [];
    
    if (media.length === 0) {
      logger.warn("[ProjectDetailScene] No media found for project:", this.projectData.title);
      console.warn("[ProjectDetailScene] ⚠️ No media items to display for project:", this.projectData.title);
      console.warn("[ProjectDetailScene] Project data:", this.projectData);
      return;
    }

    // Prevent duplicate initialization
    if (this.isInitializing) {
      logger.warn(`[ProjectDetailScene] Already initializing panels, skipping duplicate call`);
      return;
    }

    // One panel per media item
    const panelCount = media.length;
    logger.info(`[ProjectDetailScene] Creating room with ${panelCount} panels (one per media item)`);
    console.log(`[ProjectDetailScene] ========== CREATING ${panelCount} PANELS ==========`);
    console.log(`[ProjectDetailScene] Media items:`, media.map(m => ({
      id: m.id,
      name: m.name,
      title: m.title,
      filename: m.filename,
      type: m.type,
      url: m.url
    })));

    this.isInitializing = true;

    try {
      // Convert media to panel format (same as MainHallScene)
      const panels = media.map((mediaItem, index) => {
        const isVideo = mediaItem.type === 'video';
        const mediaName = mediaItem.name || mediaItem.filename || `${this.projectData.title} - Panel ${index + 1}`;
        const mediaTitle = mediaItem.title || mediaItem.name || mediaItem.filename || `${this.projectData.title} - Panel ${index + 1}`;
        
        // Description/subtitle: Use media.title as subtitle, fallback to metadata description
        const metadata = typeof mediaItem.metadata === 'string' 
          ? JSON.parse(mediaItem.metadata || '{}')
          : (mediaItem.metadata || {});
        const description = mediaItem.title || metadata.description || metadata.caption || (isVideo ? "Click to play video" : "");
        
        return {
          id: mediaItem.id || `panel-${index}`,
          name: mediaName,
          title: mediaTitle,
          description: description,
          image: isVideo ? null : mediaItem.url,
          video: isVideo ? mediaItem.url : null,
          media: [mediaItem], // Single media item per panel
          order_index: index,
        };
      });

      // Get template ID from portfolio data or use default
      const templateId = this.world.portfolioData?.template || 'creative-portfolio';
      
      // Get template-specific layout with optimal sizing based on panel count and viewport
      const layout = getTemplateLayout(templateId, panelCount);
      console.log(`[ProjectDetailScene] Layout config (optimized for ${panelCount} panels):`, layout);
      
      // Validate layout
      if (!layout) {
        throw new Error(`Invalid layout for template: ${templateId}`);
      }
      
      // Adjust panel positions to account for header panel above
      // Header is at y=2.4, so media panels should be lower to avoid overlap
      const headerHeight = 0.5;
      const headerSpacing = 0.3; // Space between header and media panels
      const adjustedLayout = {
        ...layout,
        panelPosition: {
          ...layout.panelPosition,
          y: Math.min(layout.panelPosition.y, 1.4) // Lower Y to avoid header overlap
        }
      };
      
      const positions = calculatePanelPositions(panels, adjustedLayout);
      console.log(`[ProjectDetailScene] Calculated positions for ${panels.length} panels (adjusted for header):`, positions);

      // Validate positions
      if (!positions || positions.length === 0) {
        throw new Error('Failed to calculate positions for panels');
      }

      // Render panels using the same lifecycle management as MainHallScene
      await this._renderPanelsWithProperLifecycle(panels, positions, layout);
      
    } catch (error) {
      logger.error(`[ProjectDetailScene] Error rendering panels:`, error);
      console.error(`[ProjectDetailScene] ❌ Error rendering panels:`, error);
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Render panels with proper IWSDK lifecycle management (same as MainHallScene)
   * @private
   */
  async _renderPanelsWithProperLifecycle(panels, positions, layout) {
    console.log(`[ProjectDetailScene] ========== CREATING PANELS WITH LIFECYCLE MANAGEMENT ==========`);
    console.log(`[ProjectDetailScene] Panels:`, panels.length);
    console.log(`[ProjectDetailScene] Positions:`, positions.length);
    console.log(`[ProjectDetailScene] Layout:`, layout);
    logger.info(`[ProjectDetailScene] Creating ${panels.length} panels with proper lifecycle management`);

    const maxWidth = layout?.panelMaxWidth ?? 1.5;
    const maxHeight = layout?.panelMaxHeight ?? 2.0;

    console.log(`[ProjectDetailScene] Panel dimensions: ${maxWidth}x${maxHeight}`);

    // Create all panels concurrently using the proper entity manager (same as MainHallScene)
    const panelPromises = panels.map(async (panel, index) => {
      // Validate panel data
      if (!panel || !panel.id) {
        console.warn(`[ProjectDetailScene] Invalid panel data at index ${index}:`, panel);
        logger.warn(`[ProjectDetailScene] Invalid panel data at index ${index}, skipping`);
        return null;
      }

      try {
        console.log(`[ProjectDetailScene] ========== CREATING PANEL ${index + 1}/${panels.length} ==========`);
        console.log(`[ProjectDetailScene] Panel ID:`, panel.id);
        console.log(`[ProjectDetailScene] Panel data:`, panel);
        console.log(`[ProjectDetailScene] Panel position:`, positions[index]);
        logger.info(`[ProjectDetailScene] Creating panel ${index}: ${panel.title}`);
        
        const position = positions[index] || { x: 0, y: 1.6, z: -3.0 };
        
        // Try the proper entity manager first with fallback
        let entity;
        try {
          entity = await this.panelEntityManager.createPanelEntity({
            id: panel.id,
            uiConfig: "/ui/projectPanel.json",
            maxWidth,
            maxHeight,
            position
          });
        } catch (entityManagerError) {
          logger.warn(`[ProjectDetailScene] Entity manager failed for panel ${index}, falling back to simple creation:`, entityManagerError);
          
          // Fallback: Create entity directly without complex timing
          entity = this.world.createTransformEntity().addComponent(PanelUI, {
            config: "/ui/projectPanel.json",
            maxWidth,
            maxHeight
          });
          
          // Wait a moment for PanelUI to initialize
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Simple positioning with proper lookAt
          if (entity.object3D) {
            entity.object3D.position.set(position.x, position.y, position.z);
            // Use lookAt from position if available, otherwise default to camera position
            const lookAtX = position.lookAtX !== undefined ? position.lookAtX : 0;
            const lookAtY = position.lookAtY !== undefined ? position.lookAtY : 1.6;
            const lookAtZ = position.lookAtZ !== undefined ? position.lookAtZ : 0;
            entity.object3D.lookAt(lookAtX, lookAtY, lookAtZ);
          } else {
            // If still no object3D, wait a bit more and try again
            await new Promise(resolve => setTimeout(resolve, 300));
            if (entity.object3D) {
              entity.object3D.position.set(position.x, position.y, position.z);
              const lookAtX = position.lookAtX !== undefined ? position.lookAtX : 0;
              const lookAtY = position.lookAtY !== undefined ? position.lookAtY : 1.6;
              const lookAtZ = position.lookAtZ !== undefined ? position.lookAtZ : 0;
              entity.object3D.lookAt(lookAtX, lookAtY, lookAtZ);
            }
          }
          
          logger.info(`[ProjectDetailScene] Panel ${index} created with fallback method`);
        }

        // CRITICAL: Ensure entity is visible and properly set up before tracking
        if (entity.object3D) {
          // Make sure entity is visible
          entity.object3D.visible = true;
          
          // Verify position is set
          if (!entity.object3D.position.x && !entity.object3D.position.y && !entity.object3D.position.z) {
            console.warn(`[ProjectDetailScene] Entity ${index} position not set, setting default`);
            entity.object3D.position.set(position.x, position.y, position.z);
            const lookAtX = position.lookAtX !== undefined ? position.lookAtX : 0;
            const lookAtY = position.lookAtY !== undefined ? position.lookAtY : 1.6;
            const lookAtZ = position.lookAtZ !== undefined ? position.lookAtZ : 0;
            entity.object3D.lookAt(lookAtX, lookAtY, lookAtZ);
          }
          
          console.log(`[ProjectDetailScene] Panel ${index} entity ready:`, {
            index: entity.index,
            visible: entity.object3D.visible,
            position: {
              x: entity.object3D.position.x,
              y: entity.object3D.position.y,
              z: entity.object3D.position.z
            },
            hasMaterial: !!entity.object3D.material
          });
        } else {
          console.error(`[ProjectDetailScene] Panel ${index} entity has no object3D!`);
          logger.error(`[ProjectDetailScene] Panel ${index} entity has no object3D`);
        }

        this.trackEntity(entity);

        // Bind panel content (with delay to ensure PanelUI is ready) - same approach as MainHallScene
        try {
          const portfolioId = this.world.portfolioData?.portfolio?.id || window.portfolioId || null;
          
          // Add a small delay before binding content to ensure PanelUI is fully initialized
          // Use await Promise to ensure proper timing (same as MainHallScene)
          await new Promise(resolve => setTimeout(resolve, 100 + (index * 50)));
          
          // Get panel dimensions from layout for responsive sizing
          const panelWidth = maxWidth || 1.5;
          const panelHeight = maxHeight || 2.0;
          
          console.log(`[ProjectDetailScene] ========== BINDING CONTENT FOR PANEL ${index} ==========`);
          console.log(`[ProjectDetailScene] Entity index:`, entity.index);
          console.log(`[ProjectDetailScene] Panel data:`, {
            id: panel.id,
            name: panel.name,
            title: panel.title,
            description: panel.description,
            image: panel.image,
            video: panel.video,
            hasMedia: !!panel.media && panel.media.length > 0
          });
          
          bindPanelContent(entity, {
            name: panel.name,
            title: panel.title,
            description: panel.description,
            image: panel.image,
            video: panel.video,
            media: panel.media || [],
            panelId: panel.id,
            portfolioId: portfolioId,
            panelWidth: panelWidth, // Pass panel dimensions for responsive sizing
            panelHeight: panelHeight,
          });
          
          console.log(`[ProjectDetailScene] ✅ Panel ${index} content bound successfully`);
          logger.info(`[ProjectDetailScene] Panel ${index} content bound successfully`);
        } catch (error) {
          console.error(`[ProjectDetailScene] ❌ Error binding content for panel ${index}:`, error);
          logger.error(`[ProjectDetailScene] Error binding content for panel ${index}:`, error);
        }

        return entity;
      } catch (error) {
        console.error(`[ProjectDetailScene] ❌ Error creating panel ${index}:`, error);
        logger.error(`[ProjectDetailScene] Error creating panel ${index}:`, error);
        return null;
      }
    });

    // Wait for all panels to be created
    const createdEntities = await Promise.all(panelPromises);
    const successfulEntities = createdEntities.filter(e => e !== null);

    console.log(`[ProjectDetailScene] ========== ALL PANELS CREATED ==========`);
    console.log(`[ProjectDetailScene] Successfully created ${successfulEntities.length}/${panels.length} panels`);
    logger.info(`[ProjectDetailScene] Successfully created ${successfulEntities.length}/${panels.length} panels`);
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

