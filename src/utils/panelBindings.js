import { PanelDocument } from "@iwsdk/core";
import { logger } from "./logger.js";

/**
 * Connects a PanelUI document button element to a click handler and updates its label.
 *
 * @param {Entity} entity - IWSDK entity containing the PanelUI component
 * @param {object} options
 * @param {string} options.label - text to set on the title element
 * @param {function} options.onClick - handler to invoke when button clicked
 * @param {string} options.titleId - element id for the title text
 * @param {string} options.buttonId - element id for the clickable region
 * @param {number} options.maxAttempts - number of RAF retries while waiting for document
 */
export function bindPanelButton(
  entity,
  { label, onClick, titleId = "portal-title", buttonId = "portal-button", maxAttempts = 120 }
) {
  function attemptBinding(attempt = 0) {
    const document = PanelDocument.data.document[entity.index];
    if (!document) {
      if (attempt < maxAttempts) {
        requestAnimationFrame(() => attemptBinding(attempt + 1));
      } else {
        logger.warn(
          `[PanelUI] Document not ready for entity ${entity.index} after ${maxAttempts} attempts`
        );
      }
      return;
    }

    if (titleId) {
      const titleElement = document.getElementById?.(titleId);
      if (titleElement && label !== undefined) {
        titleElement.setProperties?.({ text: label });
      }
    }

    if (buttonId && onClick) {
      const buttonElement = document.getElementById?.(buttonId);
      if (buttonElement) {
        if (!buttonElement.__panelBindingAttached) {
          buttonElement.addEventListener?.("click", onClick);
          buttonElement.__panelBindingAttached = true;
          logger.debug(`[PanelUI] Bound click for entity ${entity.index} (${label})`);
        }
      } else if (attempt < maxAttempts) {
        requestAnimationFrame(() => attemptBinding(attempt + 1));
        return;
      }
    } else {
      logger.warn(`[PanelUI] Missing buttonId for entity ${entity.index}`);
    }
  }

  attemptBinding();
}
