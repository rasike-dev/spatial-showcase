import { PanelUI } from "@iwsdk/core";
import { logger } from "./logger.js";

/**
 * Simplified Panel Entity Manager
 * Removes complex retry mechanisms and focuses on basic entity creation
 */
export class SimplePanelEntityManager {
  constructor(world) {
    this.world = world;
    this.createdEntities = new Set();
  }

  /**
   * Create a panel entity with simplified lifecycle
   * @param {Object} config - Panel configuration
   * @returns {Promise<Entity>} Created entity
   */
  async createPanelEntity(config) {
    const { uiConfig, maxWidth, maxHeight, position, id } = config;
    
    console.log(`[SimplePanelEntityManager] Creating panel entity: ${id}`);
    console.log(`[SimplePanelEntityManager] Config:`, {
      id,
      uiConfig,
      maxWidth: maxWidth || 1.5,
      maxHeight: maxHeight || 2.0,
      position
    });
    
    try {
      // Add a small delay to let IWSDK renderer stabilize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Create entity directly without complex waiting mechanisms
      const entity = this.world.createTransformEntity().addComponent(PanelUI, {
        config: uiConfig,
        maxWidth: maxWidth || 1.5,
        maxHeight: maxHeight || 2.0
      });
      
      console.log(`[SimplePanelEntityManager] Entity created:`, {
        id,
        entityIndex: entity.index,
        hasObject3D: !!entity.object3D
      });

      // Store for tracking
      this.createdEntities.add(id);

      // Wait for object3D to be available, then position
      if (position) {
        await this._waitForObject3D(entity, id);
        if (entity.object3D) {
          entity.object3D.position.set(position.x, position.y, position.z);
          entity.object3D.lookAt(0, 1.6, 0);
          // CRITICAL: Ensure entity is visible
          entity.object3D.visible = true;
          console.log(`[SimplePanelEntityManager] Entity ${id} positioned at:`, position);
          console.log(`[SimplePanelEntityManager] Entity ${id} visibility:`, entity.object3D.visible);
        } else {
          console.error(`[SimplePanelEntityManager] Entity ${id} has no object3D after wait!`);
        }
      }

      // Additional wait to ensure PanelUI component is fully initialized
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Verify entity is still valid
      if (!entity || !entity.object3D) {
        throw new Error(`Entity ${id} became invalid after creation`);
      }

      logger.info(`[SimplePanelEntityManager] Entity ${id} created successfully`);
      console.log(`[SimplePanelEntityManager] ✅ Entity ${id} fully ready:`, {
        index: entity.index,
        hasObject3D: !!entity.object3D,
        visible: entity.object3D?.visible,
        position: entity.object3D ? {
          x: entity.object3D.position.x,
          y: entity.object3D.position.y,
          z: entity.object3D.position.z
        } : null
      });
      return entity;
      
    } catch (error) {
      console.error(`[SimplePanelEntityManager] Error creating entity ${id}:`, error);
      logger.error(`[SimplePanelEntityManager] Error creating entity ${id}:`, error);
      throw error;
    }
  }

  /**
   * Wait for entity's object3D to be available
   * @private
   */
  async _waitForObject3D(entity, id, maxWait = 2000) {
    const startTime = Date.now();
    
    while (!entity.object3D && (Date.now() - startTime) < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    if (!entity.object3D) {
      console.error(`[SimplePanelEntityManager] ❌ Entity ${id} object3D not available after ${maxWait}ms`);
      console.error(`[SimplePanelEntityManager] Entity state:`, {
        index: entity.index,
        hasObject3D: false,
        entity: entity
      });
      throw new Error(`Entity ${id} object3D not available after ${maxWait}ms`);
    } else {
      console.log(`[SimplePanelEntityManager] ✅ Entity ${id} object3D ready after ${Date.now() - startTime}ms`);
      // Ensure visibility is set
      if (entity.object3D) {
        entity.object3D.visible = true;
      }
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      created: this.createdEntities.size,
      total: this.createdEntities.size
    };
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.createdEntities.clear();
    logger.info('[SimplePanelEntityManager] Cleanup completed');
  }
}