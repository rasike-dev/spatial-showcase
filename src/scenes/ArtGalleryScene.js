import { PanelUI } from "@iwsdk/core";
import { createBackButton } from "../components/BackButton.js";
import { CAMERA, GALLERY } from "../constants/sceneConstants.js";
import { BaseScene } from "./BaseScene.js";
import { getShowcaseScene } from "../content/showcaseContent.js";

export class ArtGalleryScene extends BaseScene {
  constructor(world, sceneManager) {
    super(world, sceneManager);
  }

  init() {
    this.setupCamera();

    this.sceneData = getShowcaseScene("gallery");
    if (!this.sceneData) return;

    createBackButton(this.world, this.sceneManager, this.entities);

    (this.sceneData.panels || []).forEach((panel, index) => {
      this.createArtPanel(panel, index, this.sceneData.panels.length);
    });
  }

  createArtPanel(panel, index, totalPanels) {
    const radius = GALLERY.ART.radius;
    const angle = totalPanels > 0 ? (index / totalPanels) * Math.PI * 2 : 0;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const entity = this.world.createTransformEntity().addComponent(PanelUI, {
      config: "/ui/artPanel.json",
      dynamicTitle: panel.title,
      dynamicImage: panel.image,
      dynamicDescription: panel.description || "",
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
  }
}
