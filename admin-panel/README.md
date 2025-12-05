# Admin Panel - Spatial Showcase CMS

React-based admin panel for managing VR portfolios.

## Tech Stack

- **Vite + React 18** - Fast development and build
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Accessible UI components
- **React Router** - Client-side routing
- **TanStack Query** - Server state management
- **Zustand** - Global state management
- **React Hook Form + Zod** - Form handling and validation
- **Axios** - HTTP client

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update `.env` with your API URL:
```
VITE_API_URL=http://localhost:3000/api
```

4. Start development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Project Structure

```
admin-panel/
├── src/
│   ├── api/              # API functions
│   ├── components/       # React components
│   │   ├── ui/          # shadcn/ui components
│   │   └── layout/      # Layout components
│   ├── lib/             # Utilities
│   ├── pages/           # Page components
│   │   ├── auth/       # Login, Register
│   │   ├── dashboard/  # Dashboard
│   │   └── portfolios/ # Portfolio management
│   ├── store/           # Zustand stores
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Entry point
├── tailwind.config.js
└── vite.config.ts
```

## Features

### ✅ Implemented
- User authentication (Login/Register)
- Protected routes
- Dashboard layout
- Portfolio list view
- Portfolio create/edit
- API integration
- Responsive design

### 🚧 Coming Soon
- Project management
- Media upload
- Template customization
- Share link generation
- Analytics dashboard
- Settings page

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### API Integration

The admin panel connects to the backend API at `http://localhost:3000/api`. Make sure the backend server is running before starting the admin panel.

## Authentication

- JWT tokens are stored in localStorage
- Tokens are automatically added to API requests
- Protected routes redirect to login if not authenticated

## Next Steps

1. Add project management UI
2. Implement media upload with drag-and-drop
3. Add template selector and customization
4. Create analytics dashboard
5. Add settings page
