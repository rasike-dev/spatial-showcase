import { PanelDocument } from "@iwsdk/core";
import { logger } from "./logger.js";

/**
 * Binds content (title, description, image) to a panel entity.
 *
 * @param {Entity} entity - Panel entity with PanelUI component
 * @param {Object} content - Content to bind
 * @param {string} content.title - Panel title text
 * @param {string} content.description - Panel description text
 * @param {string} content.image - Image source URL
 * @param {number} maxAttempts - Number of RAF retries while waiting for document
 */
export function bindPanelContent(entity, content, maxAttempts = 200) {
  function attemptBinding(attempt = 0) {
    try {
      // Check if entity.index is valid
      if (entity.index === undefined || entity.index === null) {
        if (attempt < maxAttempts) {
          requestAnimationFrame(() => attemptBinding(attempt + 1));
        } else {
          logger.warn(
            `[PanelContent] Entity index not available after ${maxAttempts} attempts`
          );
        }
        return;
      }

      const document = PanelDocument.data.document[entity.index];
      if (!document) {
        if (attempt < maxAttempts) {
          requestAnimationFrame(() => attemptBinding(attempt + 1));
        } else {
          logger.warn(
            `[PanelContent] Document not ready for entity ${entity.index} after ${maxAttempts} attempts`
          );
        }
        return;
      }

      // Bind title - try multiple approaches
      if (content.title) {
        let titleElement = document.getElementById?.("panel-title");

        // If not found, try querySelector
        if (!titleElement && document.querySelector) {
          titleElement = document.querySelector("#panel-title");
        }

        // If still not found, try class-based selection
        if (!titleElement && document.querySelector) {
          titleElement = document.querySelector(".project-title");
        }

        if (titleElement) {
          if (titleElement.setProperties) {
            titleElement.setProperties({ text: content.title });
          } else if (titleElement.textContent !== undefined) {
            titleElement.textContent = content.title;
          } else if (titleElement.innerText !== undefined) {
            titleElement.innerText = content.title;
          }
          logger.debug(`[PanelContent] Set title: ${content.title}`);
        } else {
          logger.warn(`[PanelContent] Title element not found for entity ${entity.index}`);
        }
      }

      // Bind description
      if (content.description) {
        let descriptionElement = document.getElementById?.("panel-description");

        // If not found, try querySelector
        if (!descriptionElement && document.querySelector) {
          descriptionElement = document.querySelector("#panel-description");
        }

        // If still not found, try class-based selection
        if (!descriptionElement && document.querySelector) {
          descriptionElement = document.querySelector(".project-description");
        }

        if (descriptionElement) {
          if (descriptionElement.setProperties) {
            descriptionElement.setProperties({ text: content.description });
          } else if (descriptionElement.textContent !== undefined) {
            descriptionElement.textContent = content.description;
          } else if (descriptionElement.innerText !== undefined) {
            descriptionElement.innerText = content.description;
          }
          logger.debug(`[PanelContent] Set description: ${content.description}`);
        } else {
          logger.warn(`[PanelContent] Description element not found for entity ${entity.index}`);
        }
      }

      // Bind image - always set a src, even if empty, to avoid missing src property errors
      let imageElement = document.getElementById?.("panel-image");

      // If not found, try querySelector
      if (!imageElement && document.querySelector) {
        imageElement = document.querySelector("#panel-image");
      }

      // If still not found, try class-based selection
      if (!imageElement && document.querySelector) {
        imageElement = document.querySelector(".project-image");
      }

      if (imageElement) {
        const imageSrc = content.image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3C/svg%3E";

        // Add error handler for image loading
        const handleImageError = () => {
          logger.warn(`[PanelContent] Image failed to load: ${imageSrc} for entity ${entity.index}`);
        };

        // Remove previous error listener if exists
        if (imageElement.removeEventListener) {
          imageElement.removeEventListener("error", handleImageError);
        }

        // Set image with multiple fallback methods
        let imageSet = false;
        if (imageElement.setProperties) {
          try {
            imageElement.setProperties({ src: imageSrc });
            imageSet = true;
            logger.debug(`[PanelContent] Set image via setProperties: ${imageSrc}`);
          } catch (e) {
            logger.debug(`[PanelContent] setProperties failed: ${e.message}`);
          }
        }
        if (!imageSet && imageElement.src !== undefined) {
          imageElement.src = imageSrc;
          imageSet = true;
          logger.debug(`[PanelContent] Set image via src property: ${imageSrc}`);
        }
        if (!imageSet && imageElement.setAttribute) {
          imageElement.setAttribute("src", imageSrc);
          imageSet = true;
          logger.debug(`[PanelContent] Set image via setAttribute: ${imageSrc}`);
        }

        // Add error listener
        if (imageElement.addEventListener) {
          imageElement.addEventListener("error", handleImageError, { once: true });
        }

        if (!imageSet) {
          logger.warn(`[PanelContent] Could not set image src for entity ${entity.index}`);
        }

      } else {
        logger.warn(`[PanelContent] Image element not found for entity ${entity.index}`);
      }

      logger.debug(`[PanelContent] Content bound for entity ${entity.index}`);

    } catch (error) {
      logger.error(`[PanelContent] Error binding content for entity ${entity.index}:`, error);
    }
  }

  attemptBinding();
}

