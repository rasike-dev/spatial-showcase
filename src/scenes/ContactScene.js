import { PanelUI } from "@iwsdk/core";

import { createBackButton } from "../components/BackButton.js";
import { CAMERA, CONTENT_PANEL } from "../constants/sceneConstants.js";
import { BaseScene } from "./BaseScene.js";

export class ContactScene extends BaseScene {
  constructor(world, sceneManager) {
    super(world, sceneManager);
  }

  init() {
    // Set camera position
    this.setupCamera();

    // Create back button
    this.createBackButton();

    // Create contact panel
    this.createContactPanel();
  }

  createBackButton() {
    createBackButton(this.world, this.sceneManager, this.entities);
  }

  createContactPanel() {
    const entity = this.world.createTransformEntity().addComponent(PanelUI, {
      config: "/ui/contactPanel.json",
      dynamicEmail: "contact@example.com",
      dynamicLinkedIn: "linkedin.com/in/yourprofile",
      dynamicGitHub: "github.com/yourusername",
      maxWidth: CONTENT_PANEL.maxWidth,
      maxHeight: CONTENT_PANEL.maxHeight
    });

    entity.object3D.position.set(0, CONTENT_PANEL.Y_POSITION, CONTENT_PANEL.Z_POSITION);
    entity.object3D.lookAt(
      CAMERA.DEFAULT_POSITION.x,
      CAMERA.DEFAULT_POSITION.y,
      CAMERA.DEFAULT_POSITION.z
    );

    this.trackEntity(entity);
    this.trackEntity(entity);
  }
}
