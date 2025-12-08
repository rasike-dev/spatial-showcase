import { PanelUI } from "@iwsdk/core";
import { bindPanelButton } from "../utils/panelBindings.js";
import { bindPanelContent } from "../utils/panelContent.js";
import { CAMERA, PORTAL } from "../constants/sceneConstants.js";
import { logger } from "../utils/logger.js";
import { BaseScene } from "./BaseScene.js";
import { getShowcaseScene } from "../content/showcaseContent.js";
import { getTemplateLayout, calculatePanelPositions, applyTemplateColors } from "../utils/templateRenderer.js";
import { SimplePanelEntityManager } from "../utils/SimplePanelEntityManager.js";

/**
 * Main hall scene that acts as the navigation hub for all other scenes.
 */
export class MainHallScene extends BaseScene {
  constructor(world, sceneManager) {
    super(world, sceneManager);
    this.portfolioData = null; // Store portfolio data for use in renderPanels
    this.panelEntityManager = new SimplePanelEntityManager(world);
    this.isInitializing = false;
  }

  /**
   * Lifecycle hook invoked by the scene manager to set up entities.
   * @param {Object} options - Optional scene data
   * @param {Object} options.portfolioData - Portfolio data from API
   */
  async init(options = {}) {
    // Set camera position on entering scene
    this.setupCamera();

    // Check if we have portfolio data from API
    this.portfolioData = options?.portfolioData || this.world.portfolioData;

    if (this.portfolioData && this.portfolioData.panels) {
      // Use portfolio data from API
      logger.info("[MainHallScene] Using portfolio data from API");
      logger.info("[MainHallScene] Panels count:", this.portfolioData.panels?.length || 0);
      logger.info("[MainHallScene] Panels data:", this.portfolioData.panels);
      logger.info("[MainHallScene] Main Hall Project:", this.portfolioData.mainHallProject);
      logger.info("[MainHallScene] Other Projects:", this.portfolioData.otherProjects?.length || 0);
      
      const panels = this.portfolioData.panels || [];
      const otherProjects = this.portfolioData.otherProjects || [];
      
      if (panels.length === 0) {
        logger.warn("[MainHallScene] No panels found for Main Hall! Check if first project has media items.");
      }
      
      // Apply template colors if available
      if (this.portfolioData.colors) {
        this.applyTemplateColors(this.portfolioData.colors);
      }

      // Render Main Hall panels (all panels for the first project)
      const templateId = this.portfolioData.template || 'creative-portfolio';
      console.log('[MainHallScene] ========== STARTING PANEL RENDERING ==========');
      console.log('[MainHallScene] Template ID:', templateId);
      console.log('[MainHallScene] Panels to render:', panels.length);
      console.log('[MainHallScene] Panel details:', panels);
      logger.info(`[MainHallScene] Starting panel rendering: ${panels.length} panels with template ${templateId}`);
      
      // CRITICAL: Await panel rendering to ensure panels are created before scene initialization completes
      try {
        await this.renderPanels(panels, templateId);
        console.log('[MainHallScene] ========== PANEL RENDERING COMPLETED ==========');
        logger.info(`[MainHallScene] Panel rendering completed successfully`);
      } catch (error) {
        console.error('[MainHallScene] Error during panel rendering:', error);
        logger.error(`[MainHallScene] Error during panel rendering:`, error);
        // Continue even if panel rendering fails
      }
      
      // Render navigation buttons to other project rooms/levels
      if (otherProjects.length > 0) {
        this.renderProjectRoomNavigation(otherProjects);
      }
    } else {
      // Fallback to default content
      logger.info("[MainHallScene] No portfolio data, using default content");
      try {
        this.sceneData = getShowcaseScene("main_hall");
        if (!this.sceneData) {
          logger.warn("[MainHallScene] Missing scene data for main_hall, scene will be empty");
          // Scene is still initialized, just without content
        } else {
          logger.info("[MainHallScene] Using default scene data:", this.sceneData);
          const panels = this.sceneData.panels || [];
          const teleports = this.sceneData.teleports || [];

          if (panels.length > 0) {
            this.renderPanels(panels);
          } else {
            logger.warn("[MainHallScene] No default panels available");
          }
          
          if (teleports && teleports.length > 0) {
            this.renderTeleports(teleports);
          }
        }
      } catch (error) {
        logger.error("[MainHallScene] Error loading default content:", error);
        // Scene is still initialized, just without content
      }
    }

    logger.info(`[MainHallScene] Created ${this.entities.length} entities`);
  }

  /**
   * Apply template colors to the scene
   */
  applyTemplateColors(colors) {
    this.templateColors = colors;
    logger.info("[MainHallScene] Template colors stored:", colors);
    
    // Apply colors to all panel entities
    this.entities.forEach(entity => {
      if (entity.hasComponent && entity.hasComponent(PanelUI)) {
        applyTemplateColors(colors, entity);
      }
    });
  }

  async renderPanels(panels, templateId = 'creative-portfolio') {
    if (this.isInitializing) {
      logger.warn(`[MainHallScene] Already initializing panels, skipping duplicate call`);
      return;
    }

    logger.info(`[MainHallScene] Starting to render ${panels.length} panels with template: ${templateId}`);
    console.log(`[MainHallScene] Rendering ${panels.length} panels:`, panels);

    // Don't render if no panels
    if (!panels || panels.length === 0) {
      logger.warn(`[MainHallScene] No panels to render, skipping`);
      return;
    }

    this.isInitializing = true;

    try {
      // Get template-specific layout with optimal sizing based on panel count and viewport
      const panelCount = panels.length;
      const layout = getTemplateLayout(templateId, panelCount);
      console.log(`[MainHallScene] Layout config (optimized for ${panelCount} panels):`, layout);
      
      // Validate layout
      if (!layout) {
        throw new Error(`Invalid layout for template: ${templateId}`);
      }
      
      const positions = calculatePanelPositions(panels, layout);
      console.log(`[MainHallScene] Calculated positions for ${panels.length} panels:`, positions);

      // Validate positions
      if (!positions || positions.length === 0) {
        throw new Error('Failed to calculate positions for panels');
      }

      await this._renderPanelsWithProperLifecycle(panels, positions, layout);
      
    } catch (error) {
      logger.error(`[MainHallScene] Error rendering panels:`, error);
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Render panels with proper IWSDK lifecycle management
   * @private
   */
  async _renderPanelsWithProperLifecycle(panels, positions, layout) {
    console.log(`[MainHallScene] ========== CREATING PANELS WITH LIFECYCLE MANAGEMENT ==========`);
    console.log(`[MainHallScene] Panels to create:`, panels.length);
    console.log(`[MainHallScene] Positions:`, positions);
    console.log(`[MainHallScene] Layout:`, layout);
    logger.info(`[MainHallScene] Creating ${panels.length} panels with proper lifecycle management`);

    const maxWidth = layout?.panelMaxWidth ?? 1.5;
    const maxHeight = layout?.panelMaxHeight ?? 2.0;

    console.log(`[MainHallScene] Panel dimensions: ${maxWidth}x${maxHeight}`);

    // Create all panels concurrently using the proper entity manager
    const panelPromises = panels.map(async (panel, index) => {
      // Validate panel data
      if (!panel || !panel.id) {
        console.warn(`[MainHallScene] Invalid panel data at index ${index}:`, panel);
        logger.warn(`[MainHallScene] Invalid panel data at index ${index}, skipping`);
        return null;
      }

      try {
        console.log(`[MainHallScene] ========== CREATING PANEL ${index + 1}/${panels.length} ==========`);
        console.log(`[MainHallScene] Panel ID:`, panel.id);
        console.log(`[MainHallScene] Panel data:`, panel);
        console.log(`[MainHallScene] Panel position:`, positions[index]);
        logger.info(`[MainHallScene] Creating panel ${index}: ${panel.title}`);
        
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
          logger.warn(`[MainHallScene] Entity manager failed for panel ${index}, falling back to simple creation:`, entityManagerError);
          
          // Fallback: Create entity directly without complex timing
          entity = this.world.createTransformEntity().addComponent(PanelUI, {
            config: "/ui/projectPanel.json",
            maxWidth,
            maxHeight
          });
          
          // Wait a moment for PanelUI to initialize
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Simple positioning
          if (entity.object3D) {
            entity.object3D.position.set(position.x, position.y, position.z);
            entity.object3D.lookAt(0, 1.6, 0);
          } else {
            // If still no object3D, wait a bit more and try again
            await new Promise(resolve => setTimeout(resolve, 300));
            if (entity.object3D) {
              entity.object3D.position.set(position.x, position.y, position.z);
              entity.object3D.lookAt(0, 1.6, 0);
            }
          }
          
          logger.info(`[MainHallScene] Panel ${index} created with fallback method`);
        }

        // CRITICAL: Ensure entity is visible and properly set up before tracking
        if (entity.object3D) {
          // Make sure entity is visible
          entity.object3D.visible = true;
          
          // Verify position is set
          if (!entity.object3D.position.x && !entity.object3D.position.y && !entity.object3D.position.z) {
            console.warn(`[MainHallScene] Entity ${index} position not set, setting default`);
            entity.object3D.position.set(position.x, position.y, position.z);
            entity.object3D.lookAt(0, 1.6, 0);
          }
          
          console.log(`[MainHallScene] Panel ${index} entity ready:`, {
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
          console.error(`[MainHallScene] Panel ${index} entity has no object3D!`);
          logger.error(`[MainHallScene] Panel ${index} entity has no object3D`);
        }

        // Track entity in scene (adds to entities array)
        this.trackEntity(entity);
        console.log(`[MainHallScene] Panel ${index} entity tracked. Total entities: ${this.entities.length}`);

        // Apply template colors if available
        if (this.templateColors) {
          try {
            applyTemplateColors(this.templateColors, entity);
          } catch (error) {
            logger.warn(`[MainHallScene] Error applying template colors to panel ${index}:`, error);
          }
        }

        // Bind panel content (with delay to ensure PanelUI is ready)
        try {
          const portfolioId = this.world.portfolioData?.portfolio?.id || null;
          
          // Add a small delay before binding content to ensure PanelUI is fully initialized
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Get panel dimensions from layout for responsive sizing
          const panelWidth = maxWidth || 1.5;
          const panelHeight = maxHeight || 2.0;
          
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
          
          console.log(`[MainHallScene] Panel ${index} content bound successfully`);
        } catch (error) {
          console.error(`[MainHallScene] Error binding content for panel ${index}:`, error);
          logger.error(`[MainHallScene] Error binding content for panel ${index}:`, error);
        }

        logger.info(`[MainHallScene] Panel ${index} created successfully`);
        console.log(`[MainHallScene] ✅ Panel ${index} fully initialized and ready`);
        return entity;

      } catch (error) {
        logger.error(`[MainHallScene] Failed to create panel ${index}:`, error);
        return null;
      }
    });

    // Wait for all panels to be created
    const entities = await Promise.allSettled(panelPromises);
    
    const successCount = entities.filter(result => 
      result.status === 'fulfilled' && result.value !== null
    ).length;
    
    const failureCount = entities.length - successCount;
    
    logger.info(`[MainHallScene] Panel creation completed: ${successCount} successful, ${failureCount} failed`);
    console.log(`[MainHallScene] ✅ Created ${successCount}/${panels.length} panels successfully`);
    console.log(`[MainHallScene] Total tracked entities: ${this.entities.length}`);
    
    if (failureCount > 0) {
      logger.warn(`[MainHallScene] ${failureCount} panels failed to create`);
      // Log which panels failed
      entities.forEach((result, index) => {
        if (result.status === 'rejected' || result.value === null) {
          console.error(`[MainHallScene] Panel ${index} failed:`, result.status === 'rejected' ? result.reason : 'returned null');
        }
      });
    }
    
    // Verify all entities have different positions and are visible
    const entityInfo = this.entities
      .filter(e => e && e.object3D)
      .map((e, idx) => ({
        index: idx,
        entityIndex: e.index,
        visible: e.object3D.visible,
        position: {
          x: e.object3D.position.x,
          y: e.object3D.position.y,
          z: e.object3D.position.z
        },
        hasMaterial: !!e.object3D.material
      }));
    
    console.log(`[MainHallScene] All entity info:`, entityInfo);
    console.log(`[MainHallScene] Visible entities: ${entityInfo.filter(e => e.visible).length}/${entityInfo.length}`);
    
    // Final verification - check if any entities are actually visible
    if (entityInfo.length === 0) {
      console.error(`[MainHallScene] ❌ NO ENTITIES CREATED! Check panel creation logic.`);
      logger.error(`[MainHallScene] No entities were created - this is a critical error`);
    } else if (entityInfo.filter(e => e.visible).length === 0) {
      console.warn(`[MainHallScene] ⚠️ Entities created but none are visible!`);
      logger.warn(`[MainHallScene] Entities created but none are visible`);
    } else {
      console.log(`[MainHallScene] ✅ ${entityInfo.filter(e => e.visible).length} visible entities ready`);
    }
  }

  renderTeleports(teleports) {
    // Position navigation buttons vertically, centered, one over another
    const verticalSpacing = 0.6; // Space between buttons vertically
    const centerY = 0.9; // Center Y position (moved up slightly)
    const offsetStart =
      teleports.length > 1 ? -((teleports.length - 1) * verticalSpacing) / 2 : 0;

    teleports.forEach((teleport, index) => {
      const yOffset = centerY + (offsetStart + index * verticalSpacing);
      // Center horizontally (x=0), stack vertically
      // Gallery (index 0) will be at top, Innovation Lab (index 1) below
      this.createPortal(teleport.label, 0, teleport.target, yOffset);
    });

    logger.info(`[MainHallScene] Created ${teleports.length} navigation portals (vertically stacked)`);
  }

  /**
   * Creates a single portal button that loads the specified scene.
   * @param {string} label - Text displayed on the portal UI
   * @param {number} xOffset - Horizontal placement of the portal (0 for centered)
   * @param {string} targetSceneName - Key of the target scene to load
   * @param {number} yOffset - Vertical placement of the portal
   */
  createPortal(label, xOffset, targetSceneName, yOffset = 0.8) {
    logger.info(`[MainHallScene] Creating portal: ${label} at x=${xOffset}, y=${yOffset}`);

    const entity = this.world.createTransformEntity().addComponent(PanelUI, {
      config: "/ui/portalPanel.json",
      maxWidth: 0.9, // Smaller width
      maxHeight: 0.35 // Smaller height
    });

    entity.object3D.position.set(xOffset, yOffset, -2.5);
    entity.object3D.lookAt(0, 1.6, 0);

    this.trackEntity(entity);

    // Simple button binding
    bindPanelButton(entity, {
      label,
      onClick: () => {
        logger.info(`[MainHallScene] Portal clicked: ${label} -> ${targetSceneName}`);
        // Pass portfolio data when navigating
        this.navigateToScene(targetSceneName, {
          portfolioData: this.portfolioData || this.world.portfolioData
        });
      }
    });

    logger.info(`[MainHallScene] Portal "${label}" created successfully`);
  }

  /**
   * Render navigation buttons to other project rooms/levels
   * @param {Array} otherProjects - Projects that are not the main hall
   */
  renderProjectRoomNavigation(otherProjects) {
    logger.info(`[MainHallScene] Rendering navigation to ${otherProjects.length} other project rooms`);
    
    // Position navigation buttons vertically, to the right side
    const verticalSpacing = 0.6;
    const centerY = 0.9;
    const xOffset = 2.0; // Position to the right
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
          logger.info(`[MainHallScene] Navigating to project room: ${project.title}`);
          this.navigateToProjectRoom(project);
        }
      });

      logger.info(`[MainHallScene] Navigation button created for: ${project.title}`);
    });
  }

  /**
   * Navigate to a project room (another level)
   * @param {Object} projectData - Project data for the room
   */
  navigateToProjectRoom(projectData) {
    if (!projectData) {
      logger.warn("[MainHallScene] No project data provided for navigation");
      return;
    }

    logger.info(`[MainHallScene] Navigating to project room: ${projectData.title}`);

    // Import and load ProjectDetailScene (which acts as a project room)
    import("./ProjectDetailScene.js").then((module) => {
      const ProjectDetailScene = module.ProjectDetailScene;
      if (ProjectDetailScene) {
        this.sceneManager.loadScene(ProjectDetailScene, {
          projectData: projectData,
          project: projectData, // Support both names for compatibility
          portfolioData: this.portfolioData || this.world.portfolioData
        });
      } else {
        logger.error("[MainHallScene] ProjectDetailScene class not found");
      }
    }).catch((error) => {
      logger.error("[MainHallScene] Failed to load ProjectDetailScene:", error);
    });
  }

  /**
   * Cleanup scene resources when leaving
   */
  cleanup() {
    super.cleanup?.();
    
    // Cleanup panel entity manager
    if (this.panelEntityManager) {
      this.panelEntityManager.cleanup();
    }
    
    // Reset initialization state
    this.isInitializing = false;
    
    logger.info("[MainHallScene] Cleanup completed");
  }
}
