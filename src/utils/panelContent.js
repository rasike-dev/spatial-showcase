import { PanelDocument } from "@iwsdk/core";
import { logger } from "./logger.js";
import { trackPanelView, trackMediaInteraction } from "./analytics.js";

/**
 * Binds content (title, description, image/video) to a panel entity.
 *
 * @param {Entity} entity - Panel entity with PanelUI component
 * @param {Object} content - Content to bind
 * @param {string} content.title - Panel title text
 * @param {string} content.description - Panel description text
 * @param {string} content.image - Image or video source URL
 * @param {string} content.video - Video source URL (alternative to image)
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
          
          // Track panel view when title is set (panel is visible)
          if (content.panelId && content.portfolioId) {
            trackPanelView(content.portfolioId, content.panelId, content.title);
          }
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

      // Determine if we're using video or image
      // For now, use image as poster/thumbnail, video will be shown in popup on click
      const mediaSrc = content.image || content.video || "";
      const isVideo = !!content.video && !content.image; // Only use video if no image is provided
      // Videos will be handled via click-to-popup instead, or shown if no image
      
      logger.info(`[PanelContent] Binding media for entity ${entity.index}`, {
        hasVideo: !!content.video,
        hasImage: !!content.image,
        mediaSrc,
        isVideo
      });
      
      // Get both image and video elements
      let imageElement = document.getElementById?.("panel-image");
      let videoElement = document.getElementById?.("panel-video");

      // If not found, try querySelector
      if (!imageElement && document.querySelector) {
        imageElement = document.querySelector("#panel-image");
      }
      if (!videoElement && document.querySelector) {
        videoElement = document.querySelector("#panel-video");
      }

      // If still not found, try class-based selection
      if (!imageElement && document.querySelector) {
        imageElement = document.querySelector(".project-image");
      }
      if (!videoElement && document.querySelector) {
        videoElement = document.querySelector(".project-video");
      }

      if (isVideo && mediaSrc) {
        if (!videoElement) {
          logger.error(`[PanelContent] Video element not found for entity ${entity.index}`, {
            document: document,
            hasGetElementById: !!document.getElementById,
            hasQuerySelector: !!document.querySelector
          });
          return;
        }
        logger.info(`[PanelContent] Setting up video for entity ${entity.index}: ${mediaSrc}`, {
          videoElement: videoElement,
          tagName: videoElement.tagName,
          hasStyle: !!videoElement.style,
          hasSetProperties: !!videoElement.setProperties,
          currentSrc: videoElement.src || videoElement.getAttribute?.("src") || "none"
        });

        // Set video source FIRST, before showing the element
        // PanelUI may validate src immediately, so it must be set before display
        // Try to find the actual HTML video element that PanelUI creates
        let actualVideoElement = null;
        
        // PanelUI might wrap the element, try to find the actual DOM element
        if (videoElement.element) {
          actualVideoElement = videoElement.element;
        } else if (videoElement.dom) {
          actualVideoElement = videoElement.dom;
        } else if (videoElement.native) {
          actualVideoElement = videoElement.native;
        } else if (videoElement.tagName === "VIDEO" || videoElement.nodeName === "VIDEO") {
          // It might already be the actual element
          actualVideoElement = videoElement;
        }
        
        // Also try querying the document for the actual video element
        // PanelUI might create the actual element in the document, try multiple selectors
        if (!actualVideoElement && document.querySelector) {
          // Try different ways to find the actual HTML video element
          let domVideo = document.querySelector("video#panel-video");
          if (!domVideo) {
            domVideo = document.querySelector("#panel-video");
          }
          if (!domVideo) {
            domVideo = document.querySelector("video.project-video");
          }
          if (!domVideo) {
            // Try to find any video element in the document
            const allVideos = document.querySelectorAll("video");
            logger.info(`[PanelContent] Found ${allVideos.length} video elements in document`);
            if (allVideos.length > 0) {
              // Use the last one (most recently added)
              domVideo = allVideos[allVideos.length - 1];
              logger.info(`[PanelContent] Using last video element:`, domVideo);
            }
          }
          
          // Verify it's actually an HTML video element
          if (domVideo && (domVideo.tagName === "VIDEO" || domVideo.nodeName === "VIDEO" || domVideo instanceof HTMLVideoElement)) {
            actualVideoElement = domVideo;
            logger.info(`[PanelContent] Found actual HTML video element via querySelector:`, {
              tagName: domVideo.tagName,
              nodeName: domVideo.nodeName,
              isHTMLVideoElement: domVideo instanceof HTMLVideoElement,
              hasLoad: !!domVideo.load,
              hasPlay: !!domVideo.play,
              hasPause: !!domVideo.pause,
              currentSrc: domVideo.src || domVideo.currentSrc
            });
          } else if (domVideo) {
            logger.warn(`[PanelContent] Found element but it's not an HTML video:`, {
              element: domVideo,
              tagName: domVideo.tagName,
              nodeName: domVideo.nodeName,
              constructor: domVideo.constructor?.name
            });
          }
        }
        
        // Set video source - try all methods to ensure it's set
        let videoSet = false;
        
        // Method 1: Try on actual DOM element if found
        if (actualVideoElement) {
          try {
            actualVideoElement.src = mediaSrc;
            videoSet = true;
            logger.info(`[PanelContent] Set video src on actual DOM element: ${mediaSrc}`);
          } catch (e) {
            logger.warn(`[PanelContent] Failed to set src on DOM element: ${e.message}`);
          }
          
          // Also try setAttribute on DOM element
          if (actualVideoElement.setAttribute) {
            try {
              actualVideoElement.setAttribute("src", mediaSrc);
              videoSet = true;
              logger.info(`[PanelContent] Set video via setAttribute on DOM element: ${mediaSrc}`);
            } catch (e) {
              logger.debug(`[PanelContent] setAttribute on DOM element failed: ${e.message}`);
            }
          }
          
          // Try to load the video
          logger.info(`[PanelContent] Checking actualVideoElement for load() method`, {
            hasLoad: !!actualVideoElement.load,
            tagName: actualVideoElement.tagName,
            nodeName: actualVideoElement.nodeName,
            type: typeof actualVideoElement.load
          });
          
          if (actualVideoElement.load) {
            try {
              actualVideoElement.load();
              logger.info(`[PanelContent] Called load() on actual DOM video element`);
            } catch (e) {
              logger.warn(`[PanelContent] load() on DOM element failed: ${e.message}`, e);
            }
          } else {
            logger.warn(`[PanelContent] actualVideoElement does not have load() method`, {
              element: actualVideoElement,
              keys: Object.keys(actualVideoElement || {})
            });
          }
        }
        
        // Method 2: Try setAttribute on PanelUI wrapper
        if (!videoSet && videoElement.setAttribute) {
          try {
            videoElement.setAttribute("src", mediaSrc);
            videoSet = true;
            logger.info(`[PanelContent] Set video via setAttribute: ${mediaSrc}`);
          } catch (e) {
            logger.warn(`[PanelContent] setAttribute failed for video: ${e.message}`);
          }
        }
        
        // Method 3: Try direct src property assignment on wrapper
        if (!videoSet && videoElement.src !== undefined) {
          try {
            videoElement.src = mediaSrc;
            videoSet = true;
            logger.info(`[PanelContent] Set video via src property: ${mediaSrc}`);
          } catch (e) {
            logger.warn(`[PanelContent] src property assignment failed: ${e.message}`);
          }
        }
        
        // Method 4: Try setProperties (PanelUI specific) - always try this
        if (videoElement.setProperties) {
          try {
            videoElement.setProperties({ src: mediaSrc });
            logger.info(`[PanelContent] Called setProperties for video: ${mediaSrc}`);
            // Don't set videoSet = true here since we can't verify it worked
          } catch (e) {
            logger.warn(`[PanelContent] setProperties failed for video: ${e.message}`);
          }
        }
        
        // Verify src was set - PanelUI elements may not expose src directly
        // Try multiple ways to check
        let currentSrc = "";
        if (videoElement.getProperties) {
          try {
            const props = videoElement.getProperties();
            currentSrc = props?.src || "";
          } catch (e) {
            logger.debug(`[PanelContent] getProperties not available: ${e.message}`);
          }
        }
        if (!currentSrc && videoElement.src !== undefined) {
          currentSrc = videoElement.src;
        }
        if (!currentSrc && videoElement.getAttribute) {
          currentSrc = videoElement.getAttribute("src") || "";
        }
        
        if (currentSrc && currentSrc !== mediaSrc) {
          logger.warn(`[PanelContent] Video src mismatch. Expected: ${mediaSrc}, Got: ${currentSrc}`);
        } else if (!currentSrc && videoSet) {
          // If setProperties succeeded but we can't verify, trust that it worked
          // PanelUI wrappers may not expose src directly
          logger.info(`[PanelContent] Video src set via setProperties (cannot verify on wrapper element): ${mediaSrc}`);
        } else if (!currentSrc && !videoSet) {
          logger.error(`[PanelContent] Video src not set after all attempts! Element:`, videoElement);
        } else {
          logger.info(`[PanelContent] Video src verified: ${currentSrc}`);
        }

        // NOW hide image and show video (after src is set)
        // Also set preload on the video to ensure it loads
        if (imageElement) {
          if (imageElement.style) {
            imageElement.style.display = "none";
          } else if (imageElement.setProperties) {
            imageElement.setProperties({ style: "display: none;" });
          }
        }
        
        // Set video to be visible and preload
        if (videoElement.setProperties) {
          try {
            // Set display and preload together
            videoElement.setProperties({ 
              style: "display: block;",
              preload: "auto"
            });
            logger.info(`[PanelContent] Video display and preload set via setProperties`);
          } catch (e) {
            logger.warn(`[PanelContent] Failed to set video display/preload: ${e.message}`);
          }
        }
        
        if (videoElement.style) {
          videoElement.style.display = "block";
          logger.info(`[PanelContent] Video display set to block via style`);
        } else if (!videoElement.setProperties) {
          logger.warn(`[PanelContent] Could not set video display - no style or setProperties`);
        }
        
        // Also try to set preload on actual DOM element if found
        if (actualVideoElement && actualVideoElement.setAttribute) {
          try {
            actualVideoElement.setAttribute("preload", "auto");
            logger.info(`[PanelContent] Set preload=auto on actual DOM video element`);
          } catch (e) {
            logger.debug(`[PanelContent] Failed to set preload on DOM element: ${e.message}`);
          }
        }

        // Load the video after setting source
        // Use the actual DOM element if we found it, otherwise use the wrapper
        const videoToUse = actualVideoElement || videoElement;
        
        // Proceed if we set the src via any method (setProperties might have worked even if we can't verify)
        // PanelUI videos might work differently - trust that setProperties worked
        if (videoSet || videoElement.setProperties) {
          logger.info(`[PanelContent] Video src set, proceeding with setup. videoSet: ${videoSet}, hasSetProperties: ${!!videoElement.setProperties}`);
          
          // Try to call load() on the actual DOM element if we found it
          if (actualVideoElement && actualVideoElement.load) {
            try {
              actualVideoElement.load();
              logger.info(`[PanelContent] Video load() called on actual DOM element for: ${mediaSrc}`);
            } catch (e) {
              logger.debug(`[PanelContent] Video load() on DOM element failed: ${e.message}`);
            }
          } else if (videoElement.load) {
            try {
              videoElement.load();
              logger.info(`[PanelContent] Video load() called on wrapper for: ${mediaSrc}`);
            } catch (e) {
              logger.debug(`[PanelContent] Video load() on wrapper failed: ${e.message}`);
            }
          } else {
            // PanelUI might handle loading automatically when src is set
            logger.info(`[PanelContent] Video element does not have load() method - PanelUI may handle loading automatically`);
          }
        } else {
          logger.error(`[PanelContent] Failed to set video src for: ${mediaSrc}`);
          return; // Don't proceed with hover handlers if src wasn't set
        }

        // Add error handler for video loading
        const handleVideoError = (event) => {
          logger.error(`[PanelContent] Video failed to load: ${mediaSrc}`, {
            error: event,
            videoElement: videoElement,
            readyState: videoElement.readyState,
            networkState: videoElement.networkState
          });
        };

        const handleVideoLoaded = () => {
          logger.info(`[PanelContent] Video loaded successfully: ${mediaSrc}`, {
            readyState: videoElement.readyState,
            duration: videoElement.duration
          });
        };

        // Remove previous listeners if any
        if (videoElement.__errorHandler) {
          videoElement.removeEventListener("error", videoElement.__errorHandler);
        }
        if (videoElement.__loadedHandler) {
          videoElement.removeEventListener("loadeddata", videoElement.__loadedHandler);
        }

        // Add event listeners
        if (videoElement.addEventListener) {
          videoElement.addEventListener("error", handleVideoError, { once: true });
          videoElement.addEventListener("loadeddata", handleVideoLoaded, { once: true });
          videoElement.__errorHandler = handleVideoError;
          videoElement.__loadedHandler = handleVideoLoaded;
        }

        // Set up hover handlers to play/pause video
        // Use the actual DOM element if we found it, otherwise try the wrapper
        const videoToControl = actualVideoElement || videoElement;
        
        const playOnHover = () => {
          logger.info(`[PanelContent] Hover detected, attempting to play video: ${mediaSrc}`, {
            hasActualElement: !!actualVideoElement,
            hasWrapper: !!videoElement,
            wrapperHasPlay: !!videoElement.play,
            actualHasPlay: !!(actualVideoElement && actualVideoElement.play)
          });
          
          // Try native play() method first (on actual DOM element if available)
          if (actualVideoElement && actualVideoElement.play) {
            actualVideoElement.play().then(() => {
              logger.info(`[PanelContent] Video playing successfully via play() on DOM element: ${mediaSrc}`);
            }).catch((error) => {
              logger.warn(`[PanelContent] Video play() on DOM element failed: ${error.message}`, error);
            });
          }
          
          // Also try play() on the wrapper - PanelUI might proxy it
          if (videoElement.play) {
            videoElement.play().then(() => {
              logger.info(`[PanelContent] Video playing successfully via play() on wrapper: ${mediaSrc}`);
            }).catch((error) => {
              logger.debug(`[PanelContent] Video play() on wrapper failed: ${error.message}`);
            });
          }
          
          // Also try PanelUI setProperties (for wrapper elements)
          if (videoElement.setProperties) {
            try {
              videoElement.setProperties({ autoplay: true, paused: false, playing: true });
              logger.info(`[PanelContent] Video play via setProperties: ${mediaSrc}`);
            } catch (e) {
              logger.debug(`[PanelContent] setProperties play failed: ${e.message}`);
            }
          }
        };

        const pauseOnLeave = () => {
          logger.info(`[PanelContent] Mouse leave detected, pausing video: ${mediaSrc}`);
          
          // Try native pause() method first (on actual DOM element if available)
          if (videoToControl && videoToControl.pause) {
            videoToControl.pause();
            logger.info(`[PanelContent] Video paused via pause(): ${mediaSrc}`);
          }
          
          // Also try PanelUI setProperties
          if (videoElement.setProperties) {
            try {
              videoElement.setProperties({ paused: true, autoplay: false });
              logger.info(`[PanelContent] Video pause via setProperties: ${mediaSrc}`);
            } catch (e) {
              logger.debug(`[PanelContent] setProperties pause failed: ${e.message}`);
            }
          }
        };

        // Remove existing listeners if any
        if (videoElement.__hoverPlayHandler) {
          videoElement.removeEventListener("mouseenter", videoElement.__hoverPlayHandler);
          videoElement.removeEventListener("mouseleave", videoElement.__hoverPauseHandler);
        }

        // Add hover event listeners
        if (videoElement.addEventListener) {
          videoElement.addEventListener("mouseenter", playOnHover);
          videoElement.addEventListener("mouseleave", pauseOnLeave);
          videoElement.__hoverPlayHandler = playOnHover;
          videoElement.__hoverPauseHandler = pauseOnLeave;
          logger.info(`[PanelContent] Hover handlers attached to video element for: ${mediaSrc}`);
        } else {
          logger.warn(`[PanelContent] Video element does not support addEventListener`);
        }
        
        // Also try to attach to actual DOM element if found
        if (actualVideoElement && actualVideoElement.addEventListener) {
          actualVideoElement.addEventListener("mouseenter", playOnHover);
          actualVideoElement.addEventListener("mouseleave", pauseOnLeave);
          logger.info(`[PanelContent] Hover handlers also attached to actual DOM video element`);
        }

        // Also add hover to the panel container for better UX
        // Try to find the panel container in the same document
        let panelContainer = null;
        if (document.querySelector) {
          panelContainer = document.querySelector(".project-panel");
        }
        // If not found, try to get it from the video element's parent
        if (!panelContainer && videoElement.parentElement) {
          panelContainer = videoElement.parentElement;
        }
        if (panelContainer && panelContainer.addEventListener) {
          const containerPlayOnHover = () => {
            logger.info(`[PanelContent] Panel container hover detected, playing video: ${mediaSrc}`);
            
            // Try native play on actual DOM element first
            if (videoToControl && videoToControl.play) {
              videoToControl.play().then(() => {
                logger.info(`[PanelContent] Video playing on panel hover: ${mediaSrc}`);
              }).catch((error) => {
                logger.warn(`[PanelContent] Video play on panel hover failed: ${error.message}`);
              });
            }
            
            // Also try PanelUI setProperties
            if (videoElement.setProperties) {
              try {
                videoElement.setProperties({ autoplay: true, paused: false });
              } catch (e) {
                logger.debug(`[PanelContent] Panel container setProperties play failed: ${e.message}`);
              }
            }
          };

          const containerPauseOnLeave = () => {
            logger.info(`[PanelContent] Panel container leave detected, pausing video: ${mediaSrc}`);
            
            // Try native pause on actual DOM element first
            if (videoToControl && videoToControl.pause) {
              videoToControl.pause();
              logger.info(`[PanelContent] Video paused on panel leave: ${mediaSrc}`);
            }
            
            // Also try PanelUI setProperties
            if (videoElement.setProperties) {
              try {
                videoElement.setProperties({ paused: true, autoplay: false });
              } catch (e) {
                logger.debug(`[PanelContent] Panel container setProperties pause failed: ${e.message}`);
              }
            }
          };

          // Remove existing listeners if any
          if (panelContainer.__hoverPlayHandler) {
            panelContainer.removeEventListener("mouseenter", panelContainer.__hoverPlayHandler);
            panelContainer.removeEventListener("mouseleave", panelContainer.__hoverPauseHandler);
          }

          panelContainer.addEventListener("mouseenter", containerPlayOnHover);
          panelContainer.addEventListener("mouseleave", containerPauseOnLeave);
          panelContainer.__hoverPlayHandler = containerPlayOnHover;
          panelContainer.__hoverPauseHandler = containerPauseOnLeave;
        }

        if (!videoSet) {
          logger.warn(`[PanelContent] Could not set video src for entity ${entity.index}`);
        }
      } else if (imageElement) {
        // Hide video, show image
        if (videoElement) {
          if (videoElement.style) {
            videoElement.style.display = "none";
          } else if (videoElement.setProperties) {
            videoElement.setProperties({ style: "display: none;" });
          }
        }

        if (imageElement.style) {
          imageElement.style.display = "block";
        } else if (imageElement.setProperties) {
          imageElement.setProperties({ style: "display: block;" });
        }

        const imageSrc = mediaSrc || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3C/svg%3E";

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

        // Add click handler for navigation or video popup
        if (content.onClick) {
          // Remove existing click handler if any
          if (imageElement.__clickHandler) {
            imageElement.removeEventListener("click", imageElement.__clickHandler);
          }

          const clickHandler = (event) => {
            if (event) {
              event.stopPropagation();
            }
            logger.info(`[PanelContent] Panel clicked, triggering onClick handler`);
            
            // Track panel click
            if (window.portfolioId && content.panelId) {
              trackPanelView(window.portfolioId, content.panelId, content.title);
            }
            
            content.onClick();
          };

          imageElement.addEventListener("click", clickHandler);
          imageElement.__clickHandler = clickHandler;
          
          // Make image look clickable
          if (imageElement.style) {
            imageElement.style.cursor = "pointer";
          } else if (imageElement.setProperties) {
            imageElement.setProperties({ style: "cursor: pointer;" });
          }
          
          logger.info(`[PanelContent] Added click handler to panel for navigation`);
        } else if (content.video && content.onImageClick) {
          // Legacy: video popup handler
          // Remove existing click handler if any
          if (imageElement.__videoClickHandler) {
            imageElement.removeEventListener("click", imageElement.__videoClickHandler);
          }

          const videoClickHandler = (event) => {
            if (event) {
              event.stopPropagation();
            }
            logger.info(`[PanelContent] Image clicked, showing video popup: ${content.video}`);
            
            // Track media interaction
            if (window.portfolioId && content.video) {
              const mediaId = content.media?.find(m => m.url === content.video)?.id || 'unknown';
              trackMediaInteraction(window.portfolioId, mediaId, 'video', 'play');
            }
            
            content.onImageClick();
          };

          imageElement.addEventListener("click", videoClickHandler);
          imageElement.__videoClickHandler = videoClickHandler;
          
          // Make image look clickable
          if (imageElement.style) {
            imageElement.style.cursor = "pointer";
          } else if (imageElement.setProperties) {
            imageElement.setProperties({ style: "cursor: pointer;" });
          }
          
          logger.info(`[PanelContent] Added click handler to image for video popup`);
        }

        if (!imageSet) {
          logger.warn(`[PanelContent] Could not set image src for entity ${entity.index}`);
        }
      } else {
        logger.warn(`[PanelContent] Media elements not found for entity ${entity.index}`);
      }

      logger.debug(`[PanelContent] Content bound for entity ${entity.index}`);

    } catch (error) {
      logger.error(`[PanelContent] Error binding content for entity ${entity.index}:`, error);
    }
  }

  attemptBinding();
}

