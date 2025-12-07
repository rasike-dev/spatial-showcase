#!/bin/bash

# Start all development services for Spatial Showcase
# Usage: ./start-dev.sh

echo "🚀 Starting Spatial Showcase Development Environment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${YELLOW}⚠️  Port $1 is already in use${NC}"
        return 1
    fi
    return 0
}

# Check ports
echo "🔍 Checking ports..."
check_port 3000 || echo "   Backend may already be running"
check_port 5173 || echo "   Admin panel may already be running"
check_port 8081 || echo "   VR app may already be running"
echo ""

# Start Backend
echo -e "${GREEN}📦 Starting Backend API...${NC}"
cd server
if [ ! -d "node_modules" ]; then
    echo "   Installing dependencies..."
    npm install
fi
npm run dev &
BACKEND_PID=$!
cd ..
echo "   Backend starting on http://localhost:3000"
echo ""

# Start Admin Panel
echo -e "${GREEN}🎨 Starting Admin Panel...${NC}"
cd admin-panel
if [ ! -d "node_modules" ]; then
    echo "   Installing dependencies..."
    npm install
fi
npm run dev &
ADMIN_PID=$!
cd ..
echo "   Admin Panel starting on http://localhost:5173"
echo ""

# Build and Start VR App (Production build for share links)
echo -e "${GREEN}🥽 Building VR App...${NC}"
if [ ! -d "node_modules" ]; then
    echo "   Installing dependencies..."
    npm install
fi

# Check if dist folder exists and is recent
if [ ! -d "dist" ] || [ "dist/index.html" -ot "src/index.js" ]; then
    echo "   Building production bundle..."
    npm run build
else
    echo "   Using existing build..."
fi

echo -e "${GREEN}🚀 Starting VR App Server...${NC}"
npm run serve &
VR_PID=$!
echo "   VR App starting on http://localhost:8081"
echo ""

# Wait a moment for services to start
sleep 3

echo ""
echo -e "${GREEN}✅ All services started!${NC}"
echo ""
echo "📋 Service URLs:"
echo "   Backend API:    http://localhost:3000"
echo "   Admin Panel:    http://localhost:5173"
echo "   VR App:         http://localhost:8081"
echo ""
echo "🛑 To stop all services, press Ctrl+C or run:"
echo "   kill $BACKEND_PID $ADMIN_PID $VR_PID"
echo ""

# Keep script running
wait

