import { PanelUI } from "@iwsdk/core";

// eslint-disable-next-line
import portfolioData from "../content/portfolio.json" assert { type: "json" };
import { createBackButton } from "../components/BackButton.js";
import { CAMERA, CONTENT_PANEL } from "../constants/sceneConstants.js";
import { BaseScene } from "./BaseScene.js";

export class AboutScene extends BaseScene {
  constructor(world, sceneManager) {
    super(world, sceneManager);
  }

  init() {
    // Set camera position
    this.setupCamera();

    // Create back button
    this.createBackButton();

    // Create about panel
    this.createAboutPanel();
  }

  createBackButton() {
    createBackButton(this.world, this.sceneManager, this.entities);
  }

  createAboutPanel() {
    const entity = this.world.createTransformEntity().addComponent(PanelUI, {
      config: "/ui/aboutPanel.json",
      dynamicName: portfolioData.name,
      dynamicRole: portfolioData.role,
      dynamicBio: portfolioData.bio,
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
  }
}
