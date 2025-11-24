import { PanelUI } from "@iwsdk/core";

// eslint-disable-next-line
import photosData from "../content/photos.json" assert { type: "json" };
import { createBackButton } from "../components/BackButton.js";
import { CAMERA, GALLERY } from "../constants/sceneConstants.js";
import { BaseScene } from "./BaseScene.js";

export class PhotoScene extends BaseScene {
  constructor(world, sceneManager) {
    super(world, sceneManager);
  }

  init() {
    // Set camera position
    this.setupCamera();

    // Create back button
    this.createBackButton();

    // Display photo panels
    photosData.forEach((photo, index) => {
      this.createPhotoPanel(photo, index);
    });
  }

  createBackButton() {
    createBackButton(this.world, this.sceneManager, this.entities);
  }

  createPhotoPanel(photo, index) {
    const radius = GALLERY.PHOTO.radius;
    const angle = (index / photosData.length) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const entity = this.world.createTransformEntity().addComponent(PanelUI, {
      config: "/ui/photoPanel.json",
      dynamicTitle: photo.title,
      dynamicImage: photo.image360 || photo.image,
      maxWidth: GALLERY.PHOTO.panel.maxWidth,
      maxHeight: GALLERY.PHOTO.panel.maxHeight
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
