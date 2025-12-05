import { PanelUI, PanelDocument } from "@iwsdk/core";
import { CAMERA, CONTENT_PANEL } from "../constants/sceneConstants.js";
import { logger } from "../utils/logger.js";
import { BaseScene } from "./BaseScene.js";
import { getShowcaseScene } from "../content/showcaseContent.js";
import { createBackButton } from "../components/BackButton.js";
import { bindPanelButton } from "../utils/panelBindings.js";
import { bindPanelContent } from "../utils/panelContent.js";

/**
 * Innovation Lab scene showcasing technical projects and tools.
 */
export class InnovationLabScene extends BaseScene {
  constructor(world, sceneManager) {
    super(world, sceneManager);
    // Shared navigation flag to prevent multiple clicks
    this.isNavigating = false;
    this.popupEntity = null; // Track video popup entity
  }

  /**
   * Lifecycle hook invoked by the scene manager to set up entities.
   */
  init() {
    this.setupCamera();

    this.sceneData = getShowcaseScene("innovation_lab");
    if (!this.sceneData) {
      logger.warn("[InnovationLabScene] Missing scene data for innovation_lab");
      return;
    }

    logger.info("InnovationLabScene: Rendering project panels...");

    // Render panels on both sides (like Main Hall)
    this.renderPanels(this.sceneData.panels || []);

    // Add back button in the middle
    createBackButton(this.world, this.sceneManager, this.entities);

    // Render forward teleports (if any)
    this.renderTeleports(this.sceneData.teleports || []);

    logger.info(`InnovationLabScene: Created ${this.entities.length} entities`);
  }

  renderPanels(panels) {
    logger.info(`[InnovationLabScene] Starting to render ${panels.length} panels`);

    // Limit to 2 panels for side-by-side layout (like Main Hall)
    const displayPanels = panels.slice(0, 2);

    displayPanels.forEach((panel, index) => {
      logger.info(`[InnovationLabScene] Rendering panel ${index}: ${panel.title}`);

      const entity = this.world.createTransformEntity().addComponent(PanelUI, {
        config: "/ui/projectPanel.json",
        maxWidth: 2.4, // Adjusted to fit visible area
        maxHeight: 2.2 // Adjusted to fit visible area
      });

      // Position panels side by side in front of user (adjusted for panel size)
      const spacing = 2.8;
      const offsetStart = displayPanels.length > 1 ? -((displayPanels.length - 1) * spacing) / 2 : 0;
      const xOffset = offsetStart + index * spacing;

      entity.object3D.position.set(xOffset, 1.6, -3.0);
      entity.object3D.lookAt(0, 1.6, 0);

      this.trackEntity(entity);

      // Delay content binding to ensure PanelUI is fully initialized
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Bind panel content with images or videos
          // If video exists, show image as poster and make it clickable to show video popup
          const videoPath = panel.video || "";
          logger.info(`[InnovationLabScene] Binding panel content:`, {
            title: panel.title,
            hasImage: !!panel.image,
            hasVideo: !!panel.video,
            imagePath: panel.image,
            videoPath: videoPath
          });
          
          bindPanelContent(entity, {
            title: panel.title,
            description: panel.description || "",
            image: panel.image || "",
            video: videoPath,
            onImageClick: videoPath ? () => {
              // Show video in popup when poster image is clicked
              logger.info(`[InnovationLabScene] Image clicked, showing video popup: ${videoPath}`);
              this.showVideoPopup(videoPath);
            } : undefined
          });
        });
      });

      logger.info(`[InnovationLabScene] Panel ${index} created at position (${xOffset}, 1.6, -3.0)`);
    });

    logger.info(`[InnovationLabScene] Created ${displayPanels.length} project panels`);
  }

  renderTeleports(teleports) {
    // Only show forward navigation to Impact Analyzer
    // Back button handles going back to Main Hall
    const impactAnalyzerTeleport = teleports.find((t) => t.target === "impact_analyzer");

    if (!impactAnalyzerTeleport) {
      logger.warn("[InnovationLabScene] Impact Analyzer teleport not found in scene data");
      // Fallback: create it explicitly
      logger.info("[InnovationLabScene] Creating explicit Impact Analyzer forward navigation");
      // Position forward button below back button (vertically stacked, centered)
      this.createPortal("Impact Analyzer", 0, "impact_analyzer", 0.5);
      return;
    }

    logger.info(
      `[InnovationLabScene] Rendering forward teleport to Impact Analyzer: ${impactAnalyzerTeleport.label}`
    );

    // Position forward button below back button (vertically stacked, centered)
    // Back button is at x=0, y=0.9 (top)
    // Forward button at x=0, y=0.5 (bottom)
    this.createPortal(impactAnalyzerTeleport.label, 0, impactAnalyzerTeleport.target, 0.5);

    logger.info(
      `[InnovationLabScene] Created forward navigation portal to Impact Analyzer: ${impactAnalyzerTeleport.label}`
    );
  }

  createPortal(label, xOffset, targetSceneId, yOffset = 0.8) {
    logger.info(
      `[InnovationLabScene] Creating portal: ${label} at x=${xOffset}, y=${yOffset} -> ${targetSceneId}`
    );

    const entity = this.world.createTransformEntity().addComponent(PanelUI, {
      config: "/ui/portalPanel.json",
      maxWidth: 1.0, // Smaller width for better visibility
      maxHeight: 0.4 // Smaller height for better visibility
    });

    entity.object3D.position.set(xOffset, yOffset, -2.5);
    entity.object3D.lookAt(0, 1.6, 0);

    this.trackEntity(entity);

    // Create a unique handler for this portal with improved stability
    const handleClick = (event) => {
      // Stop event propagation immediately to prevent multiple handlers
      if (event) {
        event.stopPropagation();
      }

      logger.info(`[InnovationLabScene] Click handler called for: ${label}`, {
        event,
        targetSceneId,
        isNavigating: this.isNavigating,
        timestamp: Date.now()
      });

      // Early return if already navigating
      if (this.isNavigating) {
        logger.warn("[InnovationLabScene] Navigation already in progress, ignoring click");
        return;
      }

      // Validate target scene
      if (targetSceneId !== "impact_analyzer") {
        logger.warn(
          `[InnovationLabScene] Invalid target scene: ${targetSceneId}, expected impact_analyzer`
        );
        return;
      }

      // Set flag immediately to prevent multiple clicks
      this.isNavigating = true;
      logger.info(`[InnovationLabScene] Starting navigation: ${label} -> impact_analyzer`);

      // Add a small delay to ensure any previous scene transitions are complete
      // This helps with stability when navigating quickly
      setTimeout(() => {
        this.navigateToScene("impact_analyzer")
          .then(() => {
            logger.info("[InnovationLabScene] Navigation to Impact Analyzer successful");
          })
          .catch((error) => {
            logger.error("[InnovationLabScene] Navigation failed:", error);
            // Reset flag on error so user can try again
            this.isNavigating = false;
          })
          .finally(() => {
            // Reset after a longer delay to ensure scene transition completes
            setTimeout(() => {
              this.isNavigating = false;
              logger.debug("[InnovationLabScene] Navigation flag reset");
            }, 3000); // Increased delay for better stability
          });
      }, 100); // Small delay to ensure scene is ready
    };

    // Bind immediately - don't delay
    bindPanelButton(entity, {
      label,
      onClick: handleClick
    });
    logger.info(`[InnovationLabScene] Button binding initiated for: ${label}`);

    logger.info(`[InnovationLabScene] Portal "${label}" created successfully`);
  }

  /**
   * Shows a popup with a video when the poster image is clicked.
   * @param {string} videoSrc - Source URL of the video to display
   */
  showVideoPopup(videoSrc) {
    logger.info(`[InnovationLabScene] Showing video popup for: ${videoSrc}`);

    // Hide existing popup if any
    if (this.popupEntity) {
      this.hideVideoPopup();
    }

    // Create popup entity
    const popupEntity = this.world.createTransformEntity().addComponent(PanelUI, {
      config: "/ui/videoPopup.json",
      maxWidth: 2.0,
      maxHeight: 1.6
    });

    logger.info(`[InnovationLabScene] Video popup entity created with index: ${popupEntity.index}`);

    // Position popup centered in front of user
    popupEntity.object3D.position.set(0, 1.5, -1.8);
    popupEntity.object3D.lookAt(0, 1.6, 0);

    logger.info(`[InnovationLabScene] Video popup positioned at: (0, 1.5, -1.8)`);

    this.trackEntity(popupEntity);
    this.popupEntity = popupEntity;

    // Bind popup content after a delay to ensure PanelUI is ready
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.bindVideoPopupContent(popupEntity, videoSrc);
      });
    });

    logger.info(`[InnovationLabScene] Video popup created for: ${videoSrc}`);
  }

  /**
   * Binds content to the video popup (video and close button).
   * @param {Entity} popupEntity - The popup entity
   * @param {string} videoSrc - Source URL of the video
   */
  bindVideoPopupContent(popupEntity, videoSrc) {
    const scene = this; // Capture 'this' for use in nested function

    function attemptBinding(attempt = 0) {
      try {
        if (popupEntity.index === undefined || popupEntity.index === null) {
          if (attempt < 200) {
            requestAnimationFrame(() => attemptBinding(attempt + 1));
          } else {
            logger.warn("[InnovationLabScene] Video popup entity index not available");
          }
          return;
        }

        const document = PanelDocument.data.document[popupEntity.index];
        if (!document) {
          if (attempt < 200) {
            requestAnimationFrame(() => attemptBinding(attempt + 1));
          } else {
            logger.warn("[InnovationLabScene] Video popup document not ready");
          }
          return;
        }

        // Check for any image elements that might be interfering
        const imageElements = document.querySelectorAll?.("img");
        if (imageElements && imageElements.length > 0) {
          logger.warn(`[InnovationLabScene] Found ${imageElements.length} image elements in video popup - hiding them`);
          imageElements.forEach((img) => {
            if (img.style) {
              img.style.display = "none";
            } else if (img.setProperties) {
              img.setProperties({ style: "display: none;" });
            }
          });
        }

        // Set popup video source
        // PanelUI wraps elements, so we need to find the actual HTML video element
        // Try to find via PanelUI wrapper first
        let videoWrapper = document.getElementById?.("popup-video");
        if (!videoWrapper && document.querySelector) {
          videoWrapper = document.querySelector("#popup-video");
        }
        if (!videoWrapper && document.querySelector) {
          videoWrapper = document.querySelector(".popup-video");
        }
        
        logger.info(`[InnovationLabScene] Video wrapper found:`, {
          found: !!videoWrapper,
          type: videoWrapper ? typeof videoWrapper : "none",
          tagName: videoWrapper?.tagName,
          nodeName: videoWrapper?.nodeName,
          keys: videoWrapper ? Object.keys(videoWrapper).slice(0, 10) : [],
          hasSetProperties: !!videoWrapper?.setProperties,
          hasSrc: videoWrapper?.src !== undefined
        });
        
        // Try to find actual HTML video element in the document
        let actualVideoElement = null;
        
        // Method 1: Try querySelectorAll on document
        if (document.querySelectorAll) {
          const allVideos = document.querySelectorAll("video");
          logger.info(`[InnovationLabScene] Found ${allVideos.length} video elements via querySelectorAll`);
          for (const vid of allVideos) {
            // Check if it's an actual HTML video element
            if (vid.tagName === "VIDEO" || vid instanceof HTMLVideoElement || vid.nodeName === "VIDEO") {
              actualVideoElement = vid;
              logger.info(`[InnovationLabScene] Found actual HTML video element via querySelectorAll`);
              break;
            }
          }
        }
        
        // Method 2: Try accessing through wrapper properties
        if (!actualVideoElement && videoWrapper) {
          // Try common PanelUI wrapper properties
          const possibleProps = ['element', 'dom', 'native', '_element', '_dom', '_native', 'video', 'htmlElement', 'nativeElement'];
          for (const prop of possibleProps) {
            if (videoWrapper[prop] && (videoWrapper[prop].tagName === "VIDEO" || videoWrapper[prop] instanceof HTMLVideoElement)) {
              actualVideoElement = videoWrapper[prop];
              logger.info(`[InnovationLabScene] Found actual HTML video element via wrapper.${prop}`);
              break;
            }
          }
          
          // If still not found, check if wrapper itself is the element
          if (!actualVideoElement && (videoWrapper.tagName === "VIDEO" || videoWrapper instanceof HTMLVideoElement)) {
            actualVideoElement = videoWrapper;
            logger.info(`[InnovationLabScene] Wrapper itself is the HTML video element`);
          }
        }
        
        // Method 3: Try accessing through PanelUI's internal structure
        if (!actualVideoElement && videoWrapper) {
          // Try to find in wrapper's children or parent
          if (videoWrapper.parentElement) {
            const parentVideos = videoWrapper.parentElement.querySelectorAll?.("video");
            if (parentVideos && parentVideos.length > 0) {
              actualVideoElement = parentVideos[0];
              logger.info(`[InnovationLabScene] Found video element in parent`);
            }
          }
        }

        logger.info(`[InnovationLabScene] Video element search results:`, {
          foundWrapper: !!videoWrapper,
          foundActualElement: !!actualVideoElement,
          wrapperType: videoWrapper ? typeof videoWrapper : "none",
          wrapperTagName: videoWrapper?.tagName,
          actualElementType: actualVideoElement ? typeof actualVideoElement : "none",
          actualElementTagName: actualVideoElement?.tagName,
          actualElementHasSrc: actualVideoElement?.src !== undefined,
          actualElementHasLoad: !!actualVideoElement?.load,
          actualElementHasPlay: !!actualVideoElement?.play
        });

        // Try to find source element (preferred method for PanelUI)
        let sourceElement = null;
        if (document.querySelectorAll) {
          const allSources = document.querySelectorAll("source");
          logger.info(`[InnovationLabScene] Found ${allSources.length} source elements via querySelectorAll`);
          for (const src of allSources) {
            if (src.id === "popup-video-source" || (src.parentElement === actualVideoElement || src.parentNode === actualVideoElement)) {
              sourceElement = src;
              logger.info(`[InnovationLabScene] Found source element for video`);
              break;
            }
          }
        }
        
        // Set video src - try multiple approaches
        let srcSet = false;
        
        // Approach 0: Set on source element (preferred for HTML5 video)
        if (sourceElement) {
          logger.info(`[InnovationLabScene] Setting video src on source element: ${videoSrc}`);
          
          if (sourceElement.src !== undefined) {
            try {
              sourceElement.src = videoSrc;
              srcSet = true;
              logger.info(`[InnovationLabScene] Set video src via source element src property: ${videoSrc}`);
            } catch (e) {
              logger.warn(`[InnovationLabScene] source element src property assignment failed: ${e.message}`);
            }
          }
          
          if (!srcSet && sourceElement.setAttribute) {
            try {
              sourceElement.setAttribute("src", videoSrc);
              sourceElement.setAttribute("type", "video/mp4");
              srcSet = true;
              logger.info(`[InnovationLabScene] Set video src via source element setAttribute: ${videoSrc}`);
            } catch (e) {
              logger.warn(`[InnovationLabScene] source element setAttribute failed: ${e.message}`);
            }
          }
          
          // If source was set, trigger video load
          if (srcSet && actualVideoElement && actualVideoElement.load) {
            try {
              actualVideoElement.load();
              logger.info(`[InnovationLabScene] Called load() after setting source element`);
            } catch (e) {
              logger.warn(`[InnovationLabScene] load() after source set failed: ${e.message}`);
            }
          }
        }
        
        // Approach 1: Set on actual HTML video element if found (fallback)
        if (!srcSet && actualVideoElement) {
          logger.info(`[InnovationLabScene] Setting video src on actual HTML element: ${videoSrc}`);
          
          // Method 1: Direct src assignment (most reliable for HTML elements)
          if (actualVideoElement.src !== undefined) {
            try {
              actualVideoElement.src = videoSrc;
              srcSet = true;
              logger.info(`[InnovationLabScene] Set video src via src property on HTML element: ${videoSrc}`);
            } catch (e) {
              logger.warn(`[InnovationLabScene] src property assignment failed: ${e.message}`);
            }
          }
          
          // Method 2: setAttribute
          if (!srcSet && actualVideoElement.setAttribute) {
            try {
              actualVideoElement.setAttribute("src", videoSrc);
              srcSet = true;
              logger.info(`[InnovationLabScene] Set video src via setAttribute on HTML element: ${videoSrc}`);
            } catch (e) {
              logger.warn(`[InnovationLabScene] setAttribute failed: ${e.message}`);
            }
          }
          
          // Verify
          const verifiedSrc = actualVideoElement.src || actualVideoElement.currentSrc || actualVideoElement.getAttribute?.("src") || "";
          if (verifiedSrc) {
            logger.info(`[InnovationLabScene] Video src verified on HTML element: ${verifiedSrc}`);
            srcSet = true;
          } else {
            logger.warn(`[InnovationLabScene] Video src not verified on HTML element after setting`);
          }
          
          // Load and play if src was set
          if (srcSet) {
            if (actualVideoElement.load) {
              try {
                actualVideoElement.load();
                logger.info(`[InnovationLabScene] Called load() on HTML video element`);
              } catch (e) {
                logger.warn(`[InnovationLabScene] load() failed: ${e.message}`);
              }
            }
            
            if (actualVideoElement.play) {
              actualVideoElement.play().then(() => {
                logger.info(`[InnovationLabScene] Video playing on HTML element`);
              }).catch((error) => {
                logger.warn(`[InnovationLabScene] Video play failed: ${error.message}`);
              });
            }
          }
        }
        
        // Approach 2: Try PanelUI wrapper methods (even if we found actual element, try both)
        if (videoWrapper && !srcSet) {
          logger.info(`[InnovationLabScene] Trying PanelUI wrapper methods`);
          
          // First, try to find the actual video element by checking all wrapper properties
          const wrapperKeys = Object.keys(videoWrapper);
          logger.info(`[InnovationLabScene] Video wrapper keys (first 30):`, wrapperKeys.slice(0, 30));
          logger.info(`[InnovationLabScene] Video wrapper full structure:`, {
            keys: wrapperKeys,
            hasElement: !!videoWrapper.element,
            hasDom: !!videoWrapper.dom,
            hasNative: !!videoWrapper.native,
            hasElement_: !!videoWrapper._element,
            hasDom_: !!videoWrapper._dom,
            hasNative_: !!videoWrapper._native,
            hasHtmlElement: !!videoWrapper.htmlElement,
            hasVideoElement: !!videoWrapper.videoElement,
            hasVideo: !!videoWrapper.video,
            hasSrc: videoWrapper.src !== undefined,
            hasSetProperties: !!videoWrapper.setProperties,
            hasSetAttribute: !!videoWrapper.setAttribute,
            type: typeof videoWrapper,
            constructor: videoWrapper.constructor?.name
          });
          
          // Try common internal property names - check all properties recursively
          const checkProperty = (obj, path = '') => {
            if (!obj || typeof obj !== 'object') return null;
            
            // Check if this is a video element
            if (obj.tagName === "VIDEO" || obj instanceof HTMLVideoElement || (obj.nodeName === "VIDEO" && obj.src !== undefined)) {
              logger.info(`[InnovationLabScene] Found video element at path: ${path}`);
              return obj;
            }
            
            // Check common property names
            for (const key of ['_element', '_dom', '_native', 'element', 'dom', 'native', 'htmlElement', 'videoElement', '_video', '_htmlElement', 'video', 'media', '_media']) {
              if (obj[key] && typeof obj[key] === 'object') {
                const found = checkProperty(obj[key], path ? `${path}.${key}` : key);
                if (found) return found;
              }
            }
            
            return null;
          };
          
          const foundVideo = checkProperty(videoWrapper, 'videoWrapper');
          if (foundVideo) {
            logger.info(`[InnovationLabScene] Found video element through recursive search`);
            if (foundVideo.src !== undefined) {
              foundVideo.src = videoSrc;
              srcSet = true;
              logger.info(`[InnovationLabScene] Set video src on found element via src property: ${videoSrc}`);
            }
            if (foundVideo.setAttribute) {
              foundVideo.setAttribute("src", videoSrc);
              srcSet = true;
              logger.info(`[InnovationLabScene] Set video src on found element via setAttribute: ${videoSrc}`);
            }
            if (srcSet) {
              // Load and play
              if (foundVideo.load) {
                foundVideo.load();
                logger.info(`[InnovationLabScene] Called load() on found video element`);
              }
              if (foundVideo.play) {
                foundVideo.play().then(() => {
                  logger.info(`[InnovationLabScene] Video playing on found element`);
                }).catch(e => logger.warn(`Play failed: ${e.message}`));
              }
            }
          }
          
          // Also try direct property access (non-recursive)
          for (const key of ['_element', '_dom', '_native', 'element', 'dom', 'native', 'htmlElement', 'videoElement', '_video', '_htmlElement']) {
            if (videoWrapper[key] && (videoWrapper[key].tagName === "VIDEO" || videoWrapper[key] instanceof HTMLVideoElement)) {
              const internalVideo = videoWrapper[key];
              logger.info(`[InnovationLabScene] Found internal video element via wrapper.${key}`);
              if (internalVideo.src !== undefined) {
                internalVideo.src = videoSrc;
                srcSet = true;
                logger.info(`[InnovationLabScene] Set video src on internal element via src property: ${videoSrc}`);
              }
              if (internalVideo.setAttribute) {
                internalVideo.setAttribute("src", videoSrc);
                srcSet = true;
                logger.info(`[InnovationLabScene] Set video src on internal element via setAttribute: ${videoSrc}`);
              }
              if (srcSet) {
                // Load and play
                if (internalVideo.load) {
                  internalVideo.load();
                }
                if (internalVideo.play) {
                  internalVideo.play().catch(e => logger.warn(`Play failed: ${e.message}`));
                }
                break;
              }
            }
          }
          
          // Try setProperties with multiple property names
          // Also check if we found the video element and use it directly
          if (!srcSet) {
            // If we found the video element through recursive search, use it
            if (foundVideo) {
              logger.info(`[InnovationLabScene] Using found video element to set src`);
              if (foundVideo.src !== undefined) {
                foundVideo.src = videoSrc;
                srcSet = true;
                logger.info(`[InnovationLabScene] Set video src directly on found element: ${videoSrc}`);
              }
              if (!srcSet && foundVideo.setAttribute) {
                foundVideo.setAttribute("src", videoSrc);
                srcSet = true;
                logger.info(`[InnovationLabScene] Set video src via setAttribute on found element: ${videoSrc}`);
              }
              if (srcSet) {
                // Load and play
                if (foundVideo.load) {
                  foundVideo.load();
                  logger.info(`[InnovationLabScene] Called load() on found video element`);
                }
                if (foundVideo.play) {
                  foundVideo.play().then(() => {
                    logger.info(`[InnovationLabScene] Video playing on found element`);
                  }).catch(e => logger.warn(`Play failed: ${e.message}`));
                }
              }
            }
            
            // Try PanelUI wrapper methods as fallback
            if (!srcSet && videoWrapper.setProperties) {
              try {
                // Try different property names that PanelUI might use
                videoWrapper.setProperties({ src: videoSrc });
                logger.info(`[InnovationLabScene] Set video src via setProperties(src): ${videoSrc}`);
                
                // Wait a bit and verify - try multiple times to catch async updates
                let verifyAttempts = 0;
                const verifySrc = () => {
                  verifyAttempts++;
                  const checkSrc = videoWrapper.src || videoWrapper.getAttribute?.("src") || "";
                  if (checkSrc) {
                    logger.info(`[InnovationLabScene] Video src verified after setProperties (attempt ${verifyAttempts}): ${checkSrc}`);
                    srcSet = true;
                    // If we have the found video element, try to load/play it
                    if (foundVideo) {
                      if (foundVideo.load) foundVideo.load();
                      if (foundVideo.play) foundVideo.play().catch(e => logger.warn(`Play failed: ${e.message}`));
                    }
                  } else if (verifyAttempts < 10) {
                    setTimeout(verifySrc, 100);
                  } else {
                    logger.warn(`[InnovationLabScene] Video src not verified after setProperties (${verifyAttempts} attempts)`);
                  }
                };
                setTimeout(verifySrc, 50);
                
                // Also try source property
                videoWrapper.setProperties({ source: videoSrc });
                logger.info(`[InnovationLabScene] Set video src via setProperties(source): ${videoSrc}`);
                
                // Also try videoSrc
                videoWrapper.setProperties({ videoSrc: videoSrc });
                logger.info(`[InnovationLabScene] Set video src via setProperties(videoSrc): ${videoSrc}`);
              } catch (e) {
                logger.warn(`[InnovationLabScene] setProperties failed: ${e.message}`);
              }
            }
          }
          
          // Try setAttribute on wrapper
          if (!srcSet && videoWrapper.setAttribute) {
            try {
              videoWrapper.setAttribute("src", videoSrc);
              logger.info(`[InnovationLabScene] Set video src via setAttribute on wrapper: ${videoSrc}`);
            } catch (e) {
              logger.warn(`[InnovationLabScene] setAttribute on wrapper failed: ${e.message}`);
            }
          }
          
          // Try direct src property
          if (!srcSet && videoWrapper.src !== undefined) {
            try {
              videoWrapper.src = videoSrc;
              logger.info(`[InnovationLabScene] Set video src via src property on wrapper: ${videoSrc}`);
            } catch (e) {
              logger.warn(`[InnovationLabScene] src property on wrapper failed: ${e.message}`);
            }
          }
        }
        
        if (!srcSet && !videoWrapper) {
          logger.error(`[InnovationLabScene] Could not find video element in popup!`);
        }

        // Add error handlers if we found the actual element
        if (actualVideoElement) {
          const handleVideoError = (event) => {
            logger.error(`[InnovationLabScene] Video failed to load: ${videoSrc}`, {
              error: event,
              currentSrc: actualVideoElement.src || actualVideoElement.currentSrc,
              networkState: actualVideoElement.networkState,
              readyState: actualVideoElement.readyState
            });
          };

          const handleVideoLoaded = () => {
            logger.info(`[InnovationLabScene] Video loaded successfully: ${videoSrc}`, {
              readyState: actualVideoElement.readyState,
              duration: actualVideoElement.duration
            });
          };

          // Remove previous listeners if any
          if (actualVideoElement.__errorHandler) {
            actualVideoElement.removeEventListener("error", actualVideoElement.__errorHandler);
          }
          if (actualVideoElement.__loadedHandler) {
            actualVideoElement.removeEventListener("loadeddata", actualVideoElement.__loadedHandler);
          }

          // Add event listeners
          if (actualVideoElement.addEventListener) {
            actualVideoElement.addEventListener("error", handleVideoError, { once: true });
            actualVideoElement.addEventListener("loadeddata", handleVideoLoaded, { once: true });
            actualVideoElement.__errorHandler = handleVideoError;
            actualVideoElement.__loadedHandler = handleVideoLoaded;
          }
        }

        // Bind close button
        let closeButton = document.getElementById?.("popup-close-button");
        if (!closeButton && document.querySelector) {
          closeButton = document.querySelector("#popup-close-button");
        }

        if (closeButton) {
          // Remove existing handler if any
          if (closeButton.__closeHandler) {
            closeButton.removeEventListener("click", closeButton.__closeHandler);
          }

          const closeHandler = (event) => {
            if (event) {
              event.stopPropagation();
            }
            logger.info("[InnovationLabScene] Close button clicked");
            scene.hideVideoPopup();
          };

          closeButton.addEventListener("click", closeHandler);
          closeButton.__closeHandler = closeHandler;
          logger.info("[InnovationLabScene] Close button bound");
        }

        logger.debug("[InnovationLabScene] Video popup content bound successfully");
      } catch (error) {
        logger.error("[InnovationLabScene] Error binding video popup content:", error);
      }
    }

    attemptBinding(0);
  }

  /**
   * Hides and disposes of the video popup.
   */
  hideVideoPopup() {
    if (this.popupEntity) {
      logger.info("[InnovationLabScene] Hiding video popup");

      const popupToRemove = this.popupEntity;
      this.popupEntity = null; // Clear reference first

      // Remove from entities array if it's there
      const index = this.entities.indexOf(popupToRemove);
      if (index > -1) {
        this.entities.splice(index, 1);
      }

      // Dispose of the popup entity
      if (popupToRemove.object3D) {
        if (popupToRemove.object3D.parent) {
          popupToRemove.object3D.parent.remove(popupToRemove.object3D);
        }
        if (this.world?.scene?.remove) {
          try {
            this.world.scene.remove(popupToRemove.object3D);
          } catch (e) {
            logger.debug(`[InnovationLabScene] Could not remove popup from world scene: ${e.message}`);
          }
        }

        // Dispose Three.js resources
        popupToRemove.object3D.traverse((object) => {
          if (object.isMesh) {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach((m) => m.dispose());
              } else {
                object.material.dispose();
              }
            }
          }
        });

        popupToRemove.object3D = null;
      }

      logger.info("[InnovationLabScene] Video popup hidden");
    }
  }

  /**
   * Override dispose to clean up popup before base disposal.
   */
  dispose() {
    // Hide popup before disposing scene
    this.hideVideoPopup();
    // Call parent dispose
    super.dispose();
  }
}


