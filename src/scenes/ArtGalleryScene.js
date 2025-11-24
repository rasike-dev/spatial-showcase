import { PanelUI } from "@iwsdk/core";

// eslint-disable-next-line
import artData from "../content/art.json" assert { type: "json" };
import { createBackButton } from "../components/BackButton.js";
import { CAMERA, GALLERY } from "../constants/sceneConstants.js";
import { BaseScene } from "./BaseScene.js";

export class ArtGalleryScene extends BaseScene {
  constructor(world, sceneManager) {
    super(world, sceneManager);
  }

  init() {
    // Set camera position
    this.setupCamera();

    // Create back button to return to main hall
    this.createBackButton();

    // Display art pieces in a gallery layout
    artData.forEach((art, index) => {
      this.createArtPanel(art, index);
    });
  }

  createBackButton() {
    createBackButton(this.world, this.sceneManager, this.entities);
  }

  createArtPanel(art, index) {
    const radius = GALLERY.ART.radius;
    const angle = (index / artData.length) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const entity = this.world.createTransformEntity().addComponent(PanelUI, {
      config: "/ui/artPanel.json",
      dynamicTitle: art.title,
      dynamicImage: art.image,
      maxWidth: GALLERY.ART.panel.maxWidth,
      maxHeight: GALLERY.ART.panel.maxHeight
    });

    entity.object3D.position.set(x, CAMERA.DEFAULT_HEIGHT, z);
    entity.object3D.lookAt(
      CAMERA.DEFAULT_POSITION.x,
      CAMERA.DEFAULT_POSITION.y,
      CAMERA.DEFAULT_POSITION.z
    );

    this.trackEntity(entity);
    this.trackEntity(entity);
  }
}
