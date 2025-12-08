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
  console.log(`[PanelContent] ========== STARTING BINDING ==========`);
  console.log(`[PanelContent] Entity index:`, entity.index);
  console.log(`[PanelContent] Content data:`, {
    name: content.name,
    title: content.title,
    description: content.description,
    image: content.image,
    video: content.video,
    hasImage: !!content.image,
    hasVideo: !!content.video
  });
  
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
          console.error(`[PanelContent] ❌ Document never became available for entity ${entity.index}`);
        }
        return;
      }
      
      // Add a small delay to ensure UIKitML has fully rendered
      if (attempt === 0) {
        // Use setTimeout instead of await since this function is called via requestAnimationFrame
        setTimeout(() => {
          // Continue with binding after delay
          attemptBinding(attempt + 1);
        }, 100);
        return;
      }
      
      // Log document structure for debugging (only on first few attempts)
      if (attempt < 3) {
        console.log(`[PanelContent] Document ready for entity ${entity.index} (attempt ${attempt}):`, {
          hasQuerySelector: !!document.querySelector,
          hasGetElementById: !!document.getElementById,
          hasQuerySelectorAll: !!document.querySelectorAll,
          documentKeys: Object.keys(document || {}).slice(0, 10),
          documentType: typeof document,
          isDocument: document instanceof Document
        });
      }

      // UIKitML compiled JSON uses IDs, not binding attributes
      // The compiled projectPanel.json has: panel-title, panel-description, panel-image
      let titleElement = null;
      
      // Method 1: Find by ID (compiled UIKitML uses IDs)
      if (document.getElementById) {
        titleElement = document.getElementById("panel-title");
      }

      // Method 2: Try querySelector with ID
      if (!titleElement && document.querySelector) {
        titleElement = document.querySelector("#panel-title");
      }

      // Method 3: Try class-based selection
      if (!titleElement && document.querySelector) {
        titleElement = document.querySelector(".project-title");
      }
      
      // Method 4: Try binding attribute (in case source JSON is used)
      if (!titleElement && document.querySelector) {
        titleElement = document.querySelector('[binding="dynamicTitle"]') || 
                      document.querySelector('[binding=dynamicTitle]');
      }
      
      if (titleElement) {
        console.log(`[PanelContent] ✅ Found title element for entity ${entity.index}:`, {
          id: titleElement.id,
          tagName: titleElement.tagName,
          hasSetProperties: !!titleElement.setProperties,
          currentText: titleElement.textContent || titleElement.innerText
        });
      } else {
        console.warn(`[PanelContent] ❌ Title element NOT found for entity ${entity.index}`);
      }

      // Try to set title if element is found (don't block rest of binding if not found)
      if (titleElement) {
        // Use name if available, otherwise use title, otherwise use a default
        const displayText = content.name || content.title || 'Media';
        
        logger.info(`[PanelContent] Attempting to set title for entity ${entity.index}: "${displayText}"`);
        logger.info(`[PanelContent] Title element found:`, {
          element: titleElement,
          hasSetProperties: !!titleElement.setProperties,
          hasTextContent: titleElement.textContent !== undefined,
          hasInnerText: titleElement.innerText !== undefined,
          hasChildren: !!titleElement.children,
          childrenType: Array.isArray(titleElement.children) ? 'array' : typeof titleElement.children,
          tagName: titleElement.tagName,
          nodeType: titleElement.nodeType
        });
        
        // Try multiple methods to set the text
        let textSet = false;
        
        // Try ALL methods in parallel (don't wait for one to fail)
        // UIKitML elements might support multiple methods
        
        // Method 1: UIKitML setProperties (preferred for UIKitML elements)
        if (titleElement.setProperties) {
          try {
            console.log(`[PanelContent] Attempting to set title via setProperties:`, {
              element: titleElement,
              displayText: displayText,
              hasGetProperties: !!titleElement.getProperties
            });
            
            // Set the text property (UIKitML text elements use 'text' property)
            titleElement.setProperties({ text: displayText });
            textSet = true;
            logger.info(`[PanelContent] ✅ Title setProperties called: "${displayText}"`);
            console.log(`[PanelContent] ✅ Title setProperties called successfully`);
            
            // Verify it was set (async verification)
            setTimeout(() => {
              let checkText = null;
              if (titleElement.getProperties) {
                try {
                  const props = titleElement.getProperties();
                  checkText = props?.text;
                  console.log(`[PanelContent] Title getProperties() returned:`, props);
                } catch (e) {
                  console.warn(`[PanelContent] Title getProperties() failed:`, e);
                }
              }
              
              if (!checkText) {
                checkText = titleElement.textContent || titleElement.innerText;
              }
              
              console.log(`[PanelContent] Title verification:`, {
                expected: displayText,
                actual: checkText,
                match: checkText === displayText || checkText?.includes(displayText)
              });
              
              if (checkText === displayText || checkText?.includes(displayText)) {
                logger.info(`[PanelContent] ✅ Title verified via setProperties: "${displayText}"`);
              } else {
                logger.warn(`[PanelContent] ⚠️ Title setProperties called but not verified. Expected: "${displayText}", Got: "${checkText}"`);
              }
            }, 100);
          } catch (e) {
            logger.warn(`[PanelContent] setProperties (text) failed:`, e);
            console.error(`[PanelContent] ❌ setProperties failed:`, e);
            textSet = false; // Allow fallback methods
          }
        } else {
          console.warn(`[PanelContent] Title element has no setProperties method!`);
        }
        
        // Method 2: textContent (standard DOM) - try even if setProperties was called
        if (titleElement.textContent !== undefined) {
          try {
            titleElement.textContent = displayText;
            if (titleElement.textContent === displayText) {
              textSet = true;
              logger.info(`[PanelContent] ✅ Title also set via textContent: "${displayText}"`);
              console.log(`[PanelContent] ✅ Title textContent set successfully`);
            }
          } catch (e) {
            logger.warn(`[PanelContent] textContent failed:`, e);
          }
        }
        
        // Method 3: innerText (standard DOM) - try even if other methods were called
        if (titleElement.innerText !== undefined) {
          try {
            titleElement.innerText = displayText;
            if (titleElement.innerText === displayText) {
              textSet = true;
              logger.info(`[PanelContent] ✅ Title also set via innerText: "${displayText}"`);
              console.log(`[PanelContent] ✅ Title innerText set successfully`);
            }
          } catch (e) {
            logger.warn(`[PanelContent] innerText failed:`, e);
          }
        }
        
        // Method 4: Direct children manipulation (for UIKitML custom elements)
        if (!textSet && titleElement.children) {
          try {
            if (Array.isArray(titleElement.children)) {
              titleElement.children = [displayText];
              textSet = true;
              logger.info(`[PanelContent] ✅ Title set via children array: "${displayText}"`);
            } else if (titleElement.children.length > 0) {
              // If children is a NodeList or similar, try to update first child
              const firstChild = titleElement.children[0];
              if (firstChild && firstChild.textContent !== undefined) {
                firstChild.textContent = displayText;
                textSet = true;
                logger.info(`[PanelContent] ✅ Title set via first child textContent: "${displayText}"`);
              }
            }
          } catch (e) {
            logger.warn(`[PanelContent] children manipulation failed:`, e);
          }
        }
        
        // Method 5: Try to find and update any text nodes
        if (!textSet && titleElement.childNodes) {
          try {
            for (let i = 0; i < titleElement.childNodes.length; i++) {
              const node = titleElement.childNodes[i];
              if (node.nodeType === 3) { // TEXT_NODE
                node.textContent = displayText;
                textSet = true;
                logger.info(`[PanelContent] ✅ Title set via text node: "${displayText}"`);
                break;
              }
            }
          } catch (e) {
            logger.warn(`[PanelContent] Text node update failed:`, e);
          }
        }
        
        // Method 6: Try innerHTML as last resort
        if (!textSet && titleElement.innerHTML !== undefined) {
          try {
            titleElement.innerHTML = displayText;
            textSet = true;
            logger.info(`[PanelContent] ✅ Title set via innerHTML: "${displayText}"`);
          } catch (e) {
            logger.warn(`[PanelContent] innerHTML failed:`, e);
          }
        }
        
        if (textSet) {
          // Track panel view when title is set (panel is visible)
          if (content.panelId && content.portfolioId) {
            trackPanelView(content.portfolioId, content.panelId, displayText);
          }
        } else {
          logger.error(`[PanelContent] ❌ All methods failed to set title for entity ${entity.index}. Element details:`, {
            element: titleElement,
            displayText: displayText,
            content: content
          });
        }
      } else {
        // Title element not found yet - retry in a few frames without blocking
        if (attempt < maxAttempts) {
          logger.debug(`[PanelContent] Title element not found for entity ${entity.index}, will retry...`);
          // Retry title binding separately without blocking rest of content
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const retryTitleElement = document.getElementById?.("panel-title") || 
                                       document.querySelector?.("#panel-title") ||
                                       document.querySelector?.(".project-title");
              if (retryTitleElement) {
                const displayText = content.name || content.title || 'Media';
                if (retryTitleElement.setProperties) {
                  try {
                    retryTitleElement.setProperties({ text: displayText });
                    logger.info(`[PanelContent] ✅ Title set on retry via setProperties: "${displayText}"`);
                  } catch (e) {
                    logger.warn(`[PanelContent] Retry setProperties failed:`, e);
                  }
                } else if (retryTitleElement.textContent !== undefined) {
                  retryTitleElement.textContent = displayText;
                  logger.info(`[PanelContent] ✅ Title set on retry via textContent: "${displayText}"`);
                } else if (retryTitleElement.innerText !== undefined) {
                  retryTitleElement.innerText = displayText;
                  logger.info(`[PanelContent] ✅ Title set on retry via innerText: "${displayText}"`);
                }
              }
            });
          });
        } else {
          logger.warn(`[PanelContent] Title element not found for entity ${entity.index} after ${maxAttempts} attempts. Document available:`, !!document);
        }
      }

      // Bind description (additional description) - shown last
      if (content.description) {
        let descriptionElement = null;
        
        // Method 1: Find by ID (compiled UIKitML uses IDs)
        if (document.getElementById) {
          descriptionElement = document.getElementById("panel-description");
        }

        // Method 2: Try querySelector with ID
        if (!descriptionElement && document.querySelector) {
          descriptionElement = document.querySelector("#panel-description");
        }

        // Method 3: Try class-based selection
        if (!descriptionElement && document.querySelector) {
          descriptionElement = document.querySelector(".project-description");
        }
        
        // Method 4: Try binding attribute (in case source JSON is used)
        if (!descriptionElement && document.querySelector) {
          descriptionElement = document.querySelector('[binding="dynamicDescription"]') || 
                              document.querySelector('[binding=dynamicDescription]');
        }
        
        if (descriptionElement) {
          console.log(`[PanelContent] ✅ Found description element for entity ${entity.index}:`, {
            id: descriptionElement.id,
            tagName: descriptionElement.tagName,
            hasSetProperties: !!descriptionElement.setProperties
          });
        } else {
          console.warn(`[PanelContent] ❌ Description element NOT found for entity ${entity.index}`);
        }

        if (descriptionElement) {
          let descSet = false;
          
          // Method 1: UIKitML binding - set the text property directly
          // UIKitML bindings work by setting the actual property (text for text elements)
          if (descriptionElement.setProperties) {
            try {
              descriptionElement.setProperties({ text: content.description });
              descSet = true;
              logger.info(`[PanelContent] ✅ Description set via setProperties (text): "${content.description}"`);
            } catch (e) {
              logger.warn(`[PanelContent] setProperties (text) failed:`, e);
            }
          }
          
          // Method 3: textContent
          if (!descSet && descriptionElement.textContent !== undefined) {
            try {
              descriptionElement.textContent = content.description;
              descSet = true;
              logger.info(`[PanelContent] ✅ Description set via textContent: "${content.description}"`);
            } catch (e) {
              logger.warn(`[PanelContent] textContent failed:`, e);
            }
          }
          
          // Method 4: innerText
          if (!descSet && descriptionElement.innerText !== undefined) {
            try {
              descriptionElement.innerText = content.description;
              descSet = true;
              logger.info(`[PanelContent] ✅ Description set via innerText: "${content.description}"`);
            } catch (e) {
              logger.warn(`[PanelContent] innerText failed:`, e);
            }
          }
          
          if (!descSet) {
            logger.warn(`[PanelContent] ⚠️ Could not set description for entity ${entity.index}`);
          }
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
      
      // UIKitML compiled JSON uses IDs, not binding attributes
      // The compiled projectPanel.json has: panel-image, panel-video
      let imageElement = null;
      let videoElement = null;
      
      // Method 1: Find by ID (compiled UIKitML uses IDs)
      if (document.getElementById) {
        imageElement = document.getElementById("panel-image");
        videoElement = document.getElementById("panel-video");
      }
      
      // Method 2: Try querySelector with ID
      if (!imageElement && document.querySelector) {
        imageElement = document.querySelector("#panel-image");
      }
      if (!videoElement && document.querySelector) {
        videoElement = document.querySelector("#panel-video");
      }
      
      // Method 3: Try class-based selection
      if (!imageElement && document.querySelector) {
        imageElement = document.querySelector(".project-image");
      }
      if (!videoElement && document.querySelector) {
        videoElement = document.querySelector(".project-video");
      }
      
      // Method 4: Try binding attribute (in case source JSON is used)
      if (!imageElement && document.querySelector) {
        imageElement = document.querySelector('[binding="dynamicImage"]') || 
                       document.querySelector('[binding=dynamicImage]');
      }
      
      // Log if image element was found
      if (imageElement) {
        console.log(`[PanelContent] ✅ Image element found for entity ${entity.index}:`, {
          id: imageElement.id,
          tagName: imageElement.tagName,
          hasSetProperties: !!imageElement.setProperties,
          hasSrc: imageElement.src !== undefined,
          currentSrc: imageElement.src || imageElement.getAttribute?.('src')
        });
      } else {
        console.warn(`[PanelContent] ❌ Image element NOT found for entity ${entity.index}`);
      }
      
      // Video element (if needed)
      if (!videoElement) {
        videoElement = document.getElementById?.("panel-video");
      }
      if (!videoElement && document.querySelector) {
        videoElement = document.querySelector("#panel-video");
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
        } else {
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
          // Don't proceed with hover handlers if src wasn't set
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
        }
      }
      
      if (!isVideo && imageElement) {
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
        // UIKitML bindings: Try setBinding first, then setProperties, then standard DOM methods
        let imageSet = false;
        
        // Method 1: UIKitML binding - set the src property directly
        // UIKitML bindings work by setting the actual property (src for image elements)
        // The binding attribute is just metadata, we set the real property
        if (imageElement.setProperties) {
          try {
            // Set the src property (UIKitML image elements use 'src' property)
            imageElement.setProperties({ src: imageSrc });
            imageSet = true;
            logger.info(`[PanelContent] ✅ Set image via setProperties (src): ${imageSrc}`);
          } catch (e) {
            logger.warn(`[PanelContent] setProperties (src) failed: ${e.message}`);
          }
        }
        
        // Method 4: Direct src property (standard DOM)
        if (!imageSet && imageElement.src !== undefined) {
          try {
            imageElement.src = imageSrc;
            imageSet = true;
            logger.info(`[PanelContent] ✅ Set image via src property: ${imageSrc}`);
          } catch (e) {
            logger.warn(`[PanelContent] src property assignment failed: ${e.message}`);
          }
        }
        
        // Method 5: setAttribute (fallback)
        if (!imageSet && imageElement.setAttribute) {
          try {
            imageElement.setAttribute("src", imageSrc);
            imageSet = true;
            logger.info(`[PanelContent] ✅ Set image via setAttribute: ${imageSrc}`);
          } catch (e) {
            logger.warn(`[PanelContent] setAttribute failed for image: ${e.message}`);
          }
        }
        
        if (!imageSet) {
          logger.error(`[PanelContent] ❌ Failed to set image src using any method: ${imageSrc}`);
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
      }
      
      if (!imageElement && !videoElement) {
        logger.warn(`[PanelContent] Media elements not found for entity ${entity.index}`);
      }

      logger.debug(`[PanelContent] Content bound for entity ${entity.index}`);
    } catch (error) {
      logger.error(`[PanelContent] Error binding content for entity ${entity.index}:`, error);
    }
  }

  attemptBinding();
}

