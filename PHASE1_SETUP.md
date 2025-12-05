# Phase 1 Setup Guide

This guide will help you set up the Phase 1 infrastructure for Spatial Showcase.

## Prerequisites

1. **Node.js** >= 20.19.0
2. **PostgreSQL** >= 14
3. **npm** or **yarn**

## Step 1: Database Setup

### Install PostgreSQL

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Linux:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download from https://www.postgresql.org/download/windows/

### Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE spatial_showcase;

# Create user (optional)
CREATE USER showcase_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE spatial_showcase TO showcase_user;

# Exit
\q
```

## Step 2: Backend API Setup

### Install Dependencies

```bash
cd server
npm install
```

### Configure Environment

Create `server/.env` file:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=spatial_showcase
DB_USER=postgres
DB_PASSWORD=postgres

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=7d

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp,image/gif
ALLOWED_VIDEO_TYPES=video/mp4,video/webm

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:8081

# Frontend URLs
ADMIN_PANEL_URL=http://localhost:5173
VR_APP_URL=http://localhost:8081
```

### Run Database Migration

```bash
cd server
npm run db:migrate
```

### Start Backend Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

The server should start on `http://localhost:3000`

Test it:
```bash
curl http://localhost:3000/health
```

## Step 3: Test API Endpoints

### Register a User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Save the token from the response for authenticated requests.

### Create Portfolio

```bash
curl -X POST http://localhost:3000/api/portfolios \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "My First Portfolio",
    "description": "A test portfolio",
    "template_id": "creative-portfolio"
  }'
```

## Step 4: Next Steps

Now that the backend is set up, the next steps are:

1. **Admin Panel** - React-based CMS interface
2. **Template System** - Create 3 basic templates
3. **VR App Integration** - Connect VR app to API
4. **Sharing System** - Implement share links
5. **Analytics** - Basic tracking

## Troubleshooting

### Database Connection Error

- Check PostgreSQL is running: `pg_isready`
- Verify credentials in `.env`
- Check database exists: `psql -l | grep spatial_showcase`

### Port Already in Use

Change `PORT` in `.env` file

### File Upload Issues

- Ensure `uploads/` directory exists
- Check file size limits in `.env`
- Verify file type restrictions

## API Documentation

See `server/README.md` for complete API documentation.

## Development Tips

1. Use `npm run dev` for auto-reload during development
2. Check server logs for debugging
3. Use Postman or curl for API testing
4. Monitor database with `psql spatial_showcase`

