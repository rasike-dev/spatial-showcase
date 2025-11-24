# Spatial Showcase

Immersive WebXR experience built with the Meta IW SDK. The project turns a
multi-room portfolio into a spatial exhibition that can be explored on Quest
devices or in the browser via WebXR.

## Highlights

- **Modular scenes** – Main Hall hub + Art, Projects, Photos, About, and Contact
  rooms wired through `SceneManager`.
- **Reusable UI components** – Back button + panel bindings powered by UIKitML.
- **XR-ready renderer** – Three.js renderer wrapped with `XRRenderer` helper.
- **Structured content** – JSON-driven panels for fast copy/image swaps.
- **Developer ergonomics** – Vite build, ESLint (flat config), Prettier, and
  shared constants/logger/error-handler utilities.

## Requirements

- Node.js **>=20.19.0** (or >=22.12.0 as recommended by Vite)
- npm 10+
- Quest headset for full XR testing (optional for local browser preview)

## Getting Started

```bash
git clone https://github.com/rasike-a/spatial-showcase.git
cd spatial-showcase
npm install
npm run dev
```

The dev server uses Vite and the IW SDK plugins. When running on a Quest, use
`https://` with a trusted certificate (e.g., `vite-plugin-mkcert`) to enable XR.

## Scripts

| Command           | Description                                   |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Start Vite dev server with hot reload         |
| `npm run build`   | Production build + UIKitML + GLTF optimization|
| `npm run preview` | Preview production build locally              |
| `npm run lint`    | ESLint (flat config)                          |
| `npm run lint:fix`| ESLint with auto-fix                          |
| `npm run format`  | Prettier write over `src/**/*.js`             |

## Project Structure (excerpt)

```
src/
  scenes/           # MainHall + content rooms
  systems/          # XRRenderer, SceneManager, App
  components/       # BackButton, future reusable bits
  utils/            # logger, errorHandler, panelBindings
  constants/        # Shared tuning values (camera, portals, etc.)
ui/                 # UIKitML definitions (compiled to public/ui)
public/             # Static assets (gltf, textures, audio)
```

## Customization Roadmap

- Replace content JSON and panel templates with your own art/project data.
- Add new scenes or interactions (`SceneManager` makes this straightforward).
- Layer in IW SDK features (hand tracking, grasping, teleport) for competition polish.

## Building for Meta Competition

1. Run `npm run build` to produce the optimized `dist/`.
2. Test on Quest via `npm run preview` (over HTTPS) or deploy the `dist` folder.
3. Record a guided walkthrough highlighting scene transitions and interactions.

Contributions via issues/PRs are welcome. Let's craft a showcase worthy of the Meta Hackathon podium! 🚀
