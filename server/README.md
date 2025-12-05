# Spatial Showcase API Server

Backend API server for the Spatial Showcase CMS and VR application.

## Setup

### Prerequisites
- Node.js >= 20.19.0
- PostgreSQL >= 14

### Installation

1. Install dependencies:
```bash
cd server
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Set up database:
```bash
# Create database
createdb spatial_showcase

# Run schema
psql spatial_showcase < src/db/schema.sql
```

4. Start the server:
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (requires auth)
- `PUT /api/auth/me` - Update user profile (requires auth)

### Portfolios
- `GET /api/portfolios` - Get user's portfolios (requires auth)
- `GET /api/portfolios/:id` - Get portfolio by ID
- `POST /api/portfolios` - Create portfolio (requires auth)
- `PUT /api/portfolios/:id` - Update portfolio (requires auth)
- `DELETE /api/portfolios/:id` - Delete portfolio (requires auth)

### Projects
- `GET /api/projects/portfolio/:portfolioId` - Get projects for portfolio
- `GET /api/projects/:id` - Get project by ID
- `POST /api/projects` - Create project (requires auth)
- `PUT /api/projects/:id` - Update project (requires auth)
- `DELETE /api/projects/:id` - Delete project (requires auth)

### Media
- `POST /api/media/upload` - Upload media file (requires auth)
- `GET /api/media?project_id=:id` - Get media for project
- `GET /api/media?portfolio_id=:id` - Get media for portfolio
- `DELETE /api/media/:id` - Delete media (requires auth)

### Sharing
- `GET /api/share/:token` - Get portfolio by share token
- `POST /api/share/:portfolioId/generate` - Generate share link

### Analytics
- `POST /api/analytics/track` - Track analytics event
- `GET /api/analytics/portfolio/:portfolioId` - Get portfolio analytics (requires auth)

## Environment Variables

See `.env.example` for all available configuration options.

## Database Schema

See `src/db/schema.sql` for the complete database schema.

## Development

The server uses Express.js and PostgreSQL. It includes:
- JWT authentication
- File upload handling (multer)
- CORS configuration
- Rate limiting
- Error handling
- Security headers (helmet)

## Next Steps

1. Set up the admin panel (React app)
2. Connect VR app to API
3. Add file storage (S3/Cloudinary) for production
4. Add email service for password reset
5. Add more advanced features

