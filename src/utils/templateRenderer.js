import { logger } from './logger.js';

/**
 * Template-based scene renderer
 * Applies different layouts and styles based on template type
 */

/**
 * Get layout configuration for a template
 */
export function getTemplateLayout(templateId) {
  const layouts = {
    'creative-portfolio': {
      panelSpacing: 1.8, // Reduced spacing - panels closer together
      panelMaxWidth: 1.6, // Reduced panel width
      panelMaxHeight: 2.0, // Reduced panel height
      panelPosition: { x: 0, y: 1.6, z: -3.0 },
      layout: 'horizontal', // horizontal, grid, vertical
      columns: 3,
    },
    'photography-gallery': {
      panelSpacing: 2.5,
      panelMaxWidth: 2.5,
      panelMaxHeight: 3.0,
      panelPosition: { x: 0, y: 1.6, z: -3.5 },
      layout: 'grid',
      columns: 2,
    },
    'project-showcase': {
      panelSpacing: 2.0,
      panelMaxWidth: 2.2,
      panelMaxHeight: 2.8,
      panelPosition: { x: 0, y: 1.6, z: -3.0 },
      layout: 'horizontal',
      columns: 2,
    },
  };

  return layouts[templateId] || layouts['creative-portfolio'];
}

/**
 * Calculate panel positions based on template layout
 */
export function calculatePanelPositions(panels, layout) {
  const positions = [];
  const { panelSpacing, panelPosition, layout: layoutType, columns } = layout;

  logger.info(`[TemplateRenderer] Calculating positions for ${panels.length} panels`, {
    layoutType,
    columns,
    panelSpacing,
    panelPosition
  });

  if (layoutType === 'grid' && columns) {
    // Grid layout
    const rows = Math.ceil(panels.length / columns);
    const rowSpacing = 2.5;
    const colSpacing = panelSpacing;

    panels.forEach((panel, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      const xOffset = (col - (columns - 1) / 2) * colSpacing;
      const yOffset = panelPosition.y - (row - (rows - 1) / 2) * rowSpacing;

      positions.push({
        x: panelPosition.x + xOffset,
        y: yOffset,
        z: panelPosition.z,
      });
    });
  } else if (layoutType === 'vertical') {
    // Vertical stack
    panels.forEach((panel, index) => {
      const yOffset = panelPosition.y - index * panelSpacing;
      positions.push({
        x: panelPosition.x,
        y: yOffset,
        z: panelPosition.z,
      });
    });
  } else {
    // Default: horizontal layout
    const offsetStart = panels.length > 1 ? -((panels.length - 1) * panelSpacing) / 2 : 0;
    logger.info(`[TemplateRenderer] Horizontal layout - offsetStart: ${offsetStart}, spacing: ${panelSpacing}`);
    panels.forEach((panel, index) => {
      const xOffset = offsetStart + index * panelSpacing;
      const position = {
        x: panelPosition.x + xOffset,
        y: panelPosition.y,
        z: panelPosition.z,
      };
      positions.push(position);
      logger.info(`[TemplateRenderer] Panel ${index} position: x=${position.x}, y=${position.y}, z=${position.z}`);
    });
  }

  logger.info(`[TemplateRenderer] Calculated ${positions.length} positions`);
  return positions;
}

/**
 * Apply template colors to UI elements
 */
export function applyTemplateColors(colors, element) {
  if (!colors || !element) return;

  try {
    // Apply colors to PanelUI elements via CSS variables or direct styling
    // This is a simplified version - in production, you'd update UIKitML styles
    
    // Store colors for use in panel rendering
    if (element.setProperties) {
      // Try to apply via PanelUI properties if available
      element.setProperties({
        primaryColor: colors.primary,
        secondaryColor: colors.secondary,
        backgroundColor: colors.background,
      });
    }

    // Also apply to document if available
    const document = element.document || element.getComponent?.('PanelDocument');
    if (document) {
      // Update CSS custom properties
      const root = document.querySelector?.(':root') || document.documentElement;
      if (root) {
        root.style.setProperty('--primary-color', colors.primary);
        root.style.setProperty('--secondary-color', colors.secondary);
        root.style.setProperty('--background-color', colors.background);
      }
    }

    logger.info('[TemplateRenderer] Applied colors:', colors);
  } catch (error) {
    logger.error('[TemplateRenderer] Error applying colors:', error);
  }
}

