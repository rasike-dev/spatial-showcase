import { PanelUI } from "@iwsdk/core";

// eslint-disable-next-line
import projectsData from "../content/projects.json" assert { type: "json" };
import { createBackButton } from "../components/BackButton.js";
import { CAMERA, GALLERY } from "../constants/sceneConstants.js";
import { BaseScene } from "./BaseScene.js";

export class ProjectsScene extends BaseScene {
  constructor(world, sceneManager) {
    super(world, sceneManager);
  }

  init() {
    // Set camera position
    this.setupCamera();

    // Create back button
    this.createBackButton();

    // Display project panels
    projectsData.forEach((project, index) => {
      this.createProjectPanel(project, index);
    });
  }

  createBackButton() {
    createBackButton(this.world, this.sceneManager, this.entities);
  }

  createProjectPanel(project, index) {
    const radius = GALLERY.PROJECTS.radius;
    const angle = (index / projectsData.length) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const entity = this.world.createTransformEntity().addComponent(PanelUI, {
      config: "/ui/projectPanel.json",
      dynamicTitle: project.title,
      dynamicDescription: project.description || "",
      dynamicImage: project.image,
      maxWidth: GALLERY.PROJECTS.panel.maxWidth,
      maxHeight: GALLERY.PROJECTS.panel.maxHeight
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
