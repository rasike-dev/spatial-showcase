# Spatial Showcase

A full-stack WebXR portfolio platform that transforms traditional portfolios into immersive 3D experiences. Built with Meta IW SDK, featuring a React admin panel for content management and a PostgreSQL backend.

## 🚀 Features

### VR Experience
- **Immersive 3D Portfolio** - Walk through your portfolio in virtual reality
- **Template System** - Choose from multiple portfolio templates (Photography Gallery, Creative Portfolio, Project Showcase)
- **Dynamic Content Loading** - Portfolios, projects, and media loaded from API
- **Color Customization** - Customize template colors that appear in VR
- **Template-Based Layouts** - Different spatial arrangements based on template
- **Analytics Tracking** - Track views, time spent, and interactions
- **Share Links** - Generate shareable links with QR codes for public viewing
- **Performance Optimized** - Caching and optimized rendering

### Admin Panel
- **Visual CMS** - Intuitive React-based content management
- **Portfolio Management** - Create, edit, and manage portfolios
- **Project Management** - Organize projects within portfolios
- **Media Upload** - Drag-and-drop media upload with preview
- **Template Selection** - Choose and customize portfolio templates
- **Color Customization** - Live preview of color schemes
- **Sharing System** - Generate share links and QR codes
- **Analytics Dashboard** - View portfolio statistics and insights
- **User Authentication** - Secure login and registration

### Backend API
- **RESTful API** - Express.js backend with PostgreSQL
- **JWT Authentication** - Secure token-based authentication
- **File Upload** - Multer-based media upload handling
- **Share Link Generation** - Unique tokens and QR code generation
- **Analytics Tracking** - Event tracking and statistics
- **Template Management** - Database-driven template system

## 📋 Requirements

- **Node.js** >= 20.19.0
- **PostgreSQL** >= 14.0
- **npm** >= 10.0
- **Quest headset** (optional, for full XR testing)

## 🏗️ Architecture

This is a monorepo containing three main components:

```
spatial-showcase/
├── src/              # VR App (Meta IW SDK)
├── server/           # Backend API (Express.js + PostgreSQL)
├── admin-panel/      # Admin CMS (React + TypeScript)
└── public/           # Static assets
```

## 🛠️ Tech Stack

### VR App
- **Meta IW SDK** 0.2.0 - WebXR framework
- **Three.js** (super-three) - 3D rendering
- **Vite** - Build tool and dev server
- **UIKitML** - UI panel definitions

### Backend
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **JWT** - Authentication
- **Multer** - File uploads
- **QRCode** - QR code generation
- **Helmet** - Security headers
- **CORS** - Cross-origin support

### Admin Panel
- **React** 19 - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **TanStack Query** - Data fetching
- **React Hook Form** - Form management
- **Zustand** - State management
- **React Router** - Routing
- **Axios** - HTTP client

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/rasike-a/spatial-showcase.git
cd spatial-showcase
```

### 2. Database Setup

```bash
# Install PostgreSQL (if not installed)
# macOS: brew install postgresql@14
# Start PostgreSQL
brew services start postgresql@14

# Create database
createdb spatial_showcase

# Or using psql
psql postgres
CREATE DATABASE spatial_showcase;
\q
```

### 3. Backend Setup

```bash
cd server
npm install

# Create .env file
cat > .env << EOF
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=spatial_showcase
DB_USER=admin
DB_PASSWORD=
JWT_SECRET=your-secret-key-change-in-production
CORS_ORIGIN=http://localhost:5176
EOF

# Run migrations
npm run db:migrate

# Start backend
npm run dev
```

Backend will run on `http://localhost:3000`

### 4. Admin Panel Setup

```bash
cd admin-panel
npm install

# Create .env file (optional)
cat > .env << EOF
VITE_API_URL=http://localhost:3000/api
EOF

# Start admin panel
npm run dev
```

Admin panel will run on `http://localhost:5176`

### 5. VR App Setup

```bash
# From project root
npm install
npm run dev
```

VR app will run on `http://localhost:8081`

## 📁 Project Structure

```
spatial-showcase/
├── src/                          # VR App Source
│   ├── app/                      # App initialization
│   │   ├── startSpatialShowcase.js
│   │   └── portfolioLoader.js   # API integration
│   ├── scenes/                   # VR Scenes
│   │   ├── MainHallScene.js      # Main portfolio scene
│   │   ├── GalleryScene.js
│   │   └── InnovationLabScene.js
│   ├── systems/                  # ECS Systems
│   │   ├── SceneManager.js
│   │   └── XRRenderer.js
│   ├── utils/                    # Utilities
│   │   ├── api.js                # API client
│   │   ├── analytics.js          # Analytics tracking
│   │   ├── cache.js              # Caching
│   │   └── templateRenderer.js   # Template rendering
│   └── constants/                # Constants
├── server/                       # Backend
│   ├── src/
│   │   ├── server.js             # Express app
│   │   ├── db/                   # Database
│   │   │   ├── connection.js
│   │   │   ├── schema.sql
│   │   │   └── templates.sql
│   │   ├── routes/               # API routes
│   │   │   ├── auth.js
│   │   │   ├── portfolios.js
│   │   │   ├── projects.js
│   │   │   ├── media.js
│   │   │   ├── templates.js
│   │   │   ├── share.js
│   │   │   └── analytics.js
│   │   └── middleware/
│   │       └── auth.js
│   └── uploads/                   # Media uploads
├── admin-panel/                  # Admin CMS
│   ├── src/
│   │   ├── api/                  # API clients
│   │   ├── components/           # React components
│   │   │   ├── templates/       # Template components
│   │   │   ├── share/            # Share components
│   │   │   └── analytics/       # Analytics components
│   │   ├── pages/                # Page components
│   │   │   ├── portfolios/
│   │   │   ├── projects/
│   │   │   └── media/
│   │   └── store/                # State management
│   └── public/
└── public/                        # Static assets
    ├── gltf/                     # 3D models
    └── ui/                       # Compiled UIKitML
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Portfolios
- `GET /api/portfolios` - List portfolios
- `GET /api/portfolios/:id` - Get portfolio
- `POST /api/portfolios` - Create portfolio
- `PUT /api/portfolios/:id` - Update portfolio
- `DELETE /api/portfolios/:id` - Delete portfolio

### Projects
- `GET /api/projects?portfolio_id=:id` - List projects
- `GET /api/projects/:id` - Get project
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Media
- `POST /api/media/upload` - Upload media
- `GET /api/media?project_id=:id` - List media
- `DELETE /api/media/:id` - Delete media

### Templates
- `GET /api/templates` - List templates
- `GET /api/templates/:id` - Get template

### Sharing
- `POST /api/share/:portfolioId/generate` - Generate share link
- `GET /api/share/:token` - Get portfolio by token

### Analytics
- `POST /api/analytics/track` - Track event
- `GET /api/analytics/portfolio/:portfolioId` - Get analytics

## 🎮 Usage

### Creating a Portfolio

1. **Register/Login** - Create an account in the admin panel
2. **Create Portfolio** - Click "Create Portfolio" and fill in details
3. **Select Template** - Choose a template (Photography, Creative, or Showcase)
4. **Customize Colors** - Adjust primary, secondary, and background colors
5. **Add Projects** - Create projects within the portfolio
6. **Upload Media** - Add images/videos to projects
7. **Share** - Generate share link for public viewing

### Viewing in VR

1. **Start VR App** - Run `npm run dev` in project root
2. **Open in Browser** - Navigate to `http://localhost:8081`
3. **Enter XR** - Click "Enter XR" button
4. **View Portfolio** - Navigate through the 3D space
5. **Interact** - Click panels to view details, images, and videos

### Public Sharing

1. **Generate Share Link** - In admin panel, click "Share Portfolio"
2. **Copy Link** - Copy the generated share link
3. **Share QR Code** - Download or share the QR code
4. **Public View** - Anyone with the link can view the portfolio in VR

## 🔧 Development

### Running All Services

```bash
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: Admin Panel
cd admin-panel
npm run dev

# Terminal 3: VR App
npm run dev
```

### Database Migrations

```bash
cd server
npm run db:migrate
```

### Building for Production

```bash
# VR App
npm run build

# Admin Panel
cd admin-panel
npm run build

# Backend (no build step, just deploy)
```

## 🧪 Testing

### Backend Testing
- Test API endpoints using Postman or curl
- Verify database migrations
- Test file uploads

### Admin Panel Testing
- Test user registration/login
- Create/edit portfolios
- Upload media
- Generate share links

### VR App Testing
- Test on Quest device
- Verify API integration
- Test template rendering
- Check analytics tracking

## 📝 Environment Variables

### Backend (`server/.env`)
```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=spatial_showcase
DB_USER=admin
DB_PASSWORD=
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:5176
```

### Admin Panel (`admin-panel/.env`)
```env
VITE_API_URL=http://localhost:3000/api
```

## 🚢 Deployment

### Backend
- Deploy to services like Railway, Render, or AWS
- Set environment variables
- Run database migrations
- Configure CORS origins

### Admin Panel
- Build: `cd admin-panel && npm run build`
- Deploy `dist/` folder to static hosting (Vercel, Netlify, etc.)
- Set `VITE_API_URL` to production API URL

### VR App
- Build: `npm run build`
- Deploy `dist/` folder to static hosting with HTTPS
- Configure API URL in code

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is part of the Meta Horizon Hackathon.

## 🎯 Roadmap

- [ ] Hand tracking support
- [ ] 3D spatial objects
- [ ] Physics and grabbing
- [ ] Spatial audio
- [ ] Scene understanding
- [ ] Multi-user support
- [ ] Advanced animations

## 📞 Support

For issues and questions, please open an issue on GitHub.

---

Built with ❤️ for the Meta Horizon Hackathon
