import { XRRenderer } from "./XRRenderer.js";
import { SceneManager } from "./SceneManager.js";
// eslint-disable-next-line
import portfolioData from "../content/portfolio.json" assert { type: "json" };
// eslint-disable-next-line
import artData from "../content/art.json" assert { type: "json" };
// eslint-disable-next-line
import projectsData from "../content/projects.json" assert { type: "json" };
// eslint-disable-next-line
import photosData from "../content/photos.json" assert { type: "json" };

/**
 * Thin orchestrator that wires together renderer, scene manager, and content data.
 */
export class App {
  /**
   * @param {{ canvas: HTMLCanvasElement }} params
   */
  constructor({ canvas }) {
    this.canvas = canvas;
    this.renderer = null;
    this.sceneManager = null;
  }

  /**
   * Initializes renderer and scene manager with remote content.
   */
  async init() {
    this.renderer = new XRRenderer({ canvas: this.canvas });
    await this.renderer.init(); // WebXR / IWSDK specific setup

    this.sceneManager = new SceneManager({
      renderer: this.renderer,
      content: {
        portfolio: portfolioData,
        art: artData,
        projects: projectsData,
        photos: photosData
      }
    });

    this.sceneManager.loadInitialScene();
  }

  /**
   * Starts the render loop and delegates updates to the scene manager.
   */
  start() {
    this.renderer.setAnimationLoop((time, frame) => {
      this.sceneManager.update(time, frame);
      this.sceneManager.render();
    });
  }
}
