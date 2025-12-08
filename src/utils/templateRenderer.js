import { logger } from './logger.js';

/**
 * Template-based scene renderer
 * Applies different layouts and styles based on template type
 */

/**
 * Calculate optimal panel size based on viewport and distance
 * @param {number} distance - Distance from camera to panels (in meters)
 * @param {number} panelCount - Number of panels to display
 * @param {string} layoutType - Layout type: 'horizontal', 'grid', 'vertical'
 * @returns {{ width: number, height: number, spacing: number }}
 */
export function calculateOptimalPanelSize(distance = 3.0, panelCount = 3, layoutType = 'horizontal') {
  // VR typical FOV: ~90-110 degrees (use 100 degrees as average)
  const fovDegrees = 100;
  const fovRadians = (fovDegrees * Math.PI) / 180;
  
  // Calculate visible width and height at the given distance
  // Using: visibleSize = 2 * distance * tan(fov/2)
  const visibleWidth = 2 * distance * Math.tan(fovRadians / 2);
  const visibleHeight = visibleWidth * 0.75; // Approximate aspect ratio for VR
  
  console.log(`[TemplateRenderer] Viewport calculation:`, {
    distance,
    fovDegrees,
    visibleWidth: visibleWidth.toFixed(2),
    visibleHeight: visibleHeight.toFixed(2),
    panelCount,
    layoutType
  });
  
  // Calculate optimal panel size based on layout
  let optimalWidth, optimalHeight, spacing;
  
  if (layoutType === 'horizontal') {
    // For horizontal layout: panels side by side
    // Use 75% of visible width for all panels with proper spacing
    const totalAvailableWidth = visibleWidth * 0.75;
    
    // Calculate spacing: leave gaps between panels (10% of panel width as gap)
    // Formula: totalWidth = (panelCount * panelWidth) + ((panelCount - 1) * gap)
    // gap = 0.1 * panelWidth, so: totalWidth = panelCount * panelWidth * 1.1 - 0.1 * panelWidth
    // Solving: panelWidth = totalWidth / (panelCount * 1.1 - 0.1)
    const gapRatio = 0.15; // 15% gap between panels
    optimalWidth = totalAvailableWidth / (panelCount * (1 + gapRatio) - gapRatio);
    
    // Spacing is panel width + gap
    spacing = optimalWidth * (1 + gapRatio);
    
    // Panel height should match viewport height availability and maintain aspect ratio with width
    // Use 75% of visible height, but ensure it matches panel width aspect ratio (16:9 or similar)
    const maxHeightByViewport = visibleHeight * 0.75;
    const aspectRatio = 16 / 9; // Standard panel aspect ratio
    const heightByAspectRatio = optimalWidth / aspectRatio;
    
    // Use the smaller of the two to ensure it fits both viewport and maintains aspect ratio
    optimalHeight = Math.min(maxHeightByViewport, heightByAspectRatio);
    
    console.log(`[TemplateRenderer] Horizontal layout calculation:`, {
      totalAvailableWidth: totalAvailableWidth.toFixed(2),
      optimalWidth: optimalWidth.toFixed(2),
      spacing: spacing.toFixed(2),
      maxHeightByViewport: maxHeightByViewport.toFixed(2),
      heightByAspectRatio: heightByAspectRatio.toFixed(2),
      optimalHeight: optimalHeight.toFixed(2)
    });
    
  } else if (layoutType === 'grid') {
    // For grid layout: calculate based on columns
    const columns = Math.ceil(Math.sqrt(panelCount));
    const rows = Math.ceil(panelCount / columns);
    
    const totalAvailableWidth = visibleWidth * 0.8;
    const totalAvailableHeight = visibleHeight * 0.75;
    
    // Calculate panel width with spacing
    const gapRatio = 0.15;
    const panelWidthWithSpacing = totalAvailableWidth / (columns * (1 + gapRatio) - gapRatio);
    optimalWidth = panelWidthWithSpacing;
    const horizontalSpacing = optimalWidth * (1 + gapRatio);
    
    // Calculate panel height with spacing
    const panelHeightWithSpacing = totalAvailableHeight / (rows * (1 + gapRatio) - gapRatio);
    optimalHeight = panelHeightWithSpacing;
    const verticalSpacing = optimalHeight * (1 + gapRatio);
    
    // Use the smaller spacing to maintain grid alignment
    spacing = Math.min(horizontalSpacing, verticalSpacing);
    
    // Adjust panel size to maintain aspect ratio if needed
    const aspectRatio = 16 / 9;
    if (optimalHeight > optimalWidth / aspectRatio) {
      optimalHeight = optimalWidth / aspectRatio;
    }
    
    console.log(`[TemplateRenderer] Grid layout calculation:`, {
      columns,
      rows,
      optimalWidth: optimalWidth.toFixed(2),
      optimalHeight: optimalHeight.toFixed(2),
      spacing: spacing.toFixed(2)
    });
    
  } else {
    // Vertical layout
    const totalAvailableHeight = visibleHeight * 0.75;
    const gapRatio = 0.15;
    optimalHeight = totalAvailableHeight / (panelCount * (1 + gapRatio) - gapRatio);
    spacing = optimalHeight * (1 + gapRatio);
    
    // Panel width should maintain aspect ratio with height
    const aspectRatio = 16 / 9;
    optimalWidth = optimalHeight * aspectRatio;
    
    // Ensure width doesn't exceed viewport
    const maxWidth = visibleWidth * 0.6;
    if (optimalWidth > maxWidth) {
      optimalWidth = maxWidth;
      optimalHeight = optimalWidth / aspectRatio;
    }
  }
  
  // Apply min/max constraints to ensure readability
  optimalWidth = Math.max(1.5, Math.min(3.5, optimalWidth));
  optimalHeight = Math.max(2.0, Math.min(4.0, optimalHeight));
  
  // Ensure spacing is at least 10% larger than panel width to prevent overlap
  if (layoutType === 'horizontal' && spacing < optimalWidth * 1.1) {
    spacing = optimalWidth * 1.1;
    console.log(`[TemplateRenderer] Adjusted spacing to prevent overlap: ${spacing.toFixed(2)}`);
  }
  
  console.log(`[TemplateRenderer] Final optimal panel size:`, {
    width: optimalWidth.toFixed(2),
    height: optimalHeight.toFixed(2),
    spacing: spacing.toFixed(2),
    layoutType,
    aspectRatio: (optimalWidth / optimalHeight).toFixed(2)
  });
  
  return {
    width: optimalWidth,
    height: optimalHeight,
    spacing: spacing
  };
}

/**
 * Get layout configuration for a template
 */
export function getTemplateLayout(templateId, panelCount = 3) {
  // Calculate optimal sizes based on viewport
  const defaultDistance = 3.0;
  
  const layouts = {
    'creative-portfolio': {
      panelPosition: { x: 0, y: 1.6, z: -3.0 },
      layout: 'horizontal',
      columns: 3,
      // Will be calculated dynamically
    },
    'photography-gallery': {
      panelPosition: { x: 0, y: 1.6, z: -3.5 },
      layout: 'grid',
      columns: 2,
      // Will be calculated dynamically
    },
    'project-showcase': {
      panelPosition: { x: 0, y: 1.6, z: -3.0 },
      layout: 'horizontal',
      columns: 2,
      // Will be calculated dynamically
    },
  };

  const baseLayout = layouts[templateId] || layouts['creative-portfolio'];
  const distance = Math.abs(baseLayout.panelPosition.z);
  
  // Calculate optimal panel sizes based on viewport
  const optimalSizes = calculateOptimalPanelSize(
    distance,
    panelCount,
    baseLayout.layout
  );
  
  return {
    ...baseLayout,
    panelSpacing: optimalSizes.spacing,
    panelMaxWidth: optimalSizes.width,
    panelMaxHeight: optimalSizes.height,
  };
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

