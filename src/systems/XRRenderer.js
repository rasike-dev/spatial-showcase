import * as THREE from "three";
import { CAMERA, LIGHTING } from "../constants/sceneConstants.js";

/**
 * Thin wrapper around THREE.WebGLRenderer that enables XR support and exposes
 * helper methods used throughout the app.
 */
export class XRRenderer {
  /**
   * @param {{ canvas: HTMLCanvasElement }} params
   */
  constructor({ canvas }) {
    this.canvas = canvas;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
  }

  /**
   * Instantiates renderer, scene, camera and registers resize listeners.
   */
  async init() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      CAMERA.FOV,
      window.innerWidth / window.innerHeight,
      CAMERA.NEAR,
      CAMERA.FAR
    );

    this.scene.add(
      new THREE.HemisphereLight(LIGHTING.SKY_COLOR, LIGHTING.GROUND_COLOR, LIGHTING.INTENSITY)
    );

    window.addEventListener("resize", () => this.onResize(), false);

    // In a real IWSDK/WebXR app, you'd request an XR session here,
    // or rely on the IWSDK helper that does it for you.
  }

  /**
   * @returns {{ renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera }}
   */
  getThreeContext() {
    return {
      renderer: this.renderer,
      scene: this.scene,
      camera: this.camera
    };
  }

  /**
   * Sets the render loop callback used for the XR session.
   * @param {(time: number, frame: XRFrame) => void} callback
   */
  setAnimationLoop(callback) {
    this.renderer.setAnimationLoop(callback);
  }

  /**
   * Keeps renderer and camera aspect ratio in sync with browser resize events.
   */
  onResize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * Renders the current scene once (used for non-XR fallbacks/tests).
   */
  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
