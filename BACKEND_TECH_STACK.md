# Backend Technology Stack

## 🎯 Current Backend Stack

### Core Framework
**Node.js + Express.js** ✅
- **Node.js**: JavaScript runtime
- **Express.js**: Web framework
- **Why**: Simple, flexible, well-documented, large ecosystem

### Database
**PostgreSQL** ✅
- **Why**: 
  - Relational database (perfect for portfolios, projects, users)
  - ACID compliance
  - JSONB support (for flexible settings/metadata)
  - Excellent performance
  - Free and open-source

### Database Client
**pg (node-postgres)** ✅
- **Why**: Official PostgreSQL client for Node.js
- Lightweight, performant
- Connection pooling built-in

### Authentication
**JWT (jsonwebtoken) + bcryptjs** ✅
- **JWT**: Stateless authentication tokens
- **bcryptjs**: Password hashing
- **Why**: Industry standard, secure, scalable

### File Upload
**Multer** ✅
- **Why**: Popular Express middleware for handling multipart/form-data
- Supports file validation, size limits
- Easy integration

### Security
**Helmet** ✅
- **Why**: Sets security HTTP headers
- Protects against common vulnerabilities

**express-rate-limit** ✅
- **Why**: Prevents abuse, DDoS protection
- Configurable rate limits

### Utilities
**CORS** ✅
- Cross-Origin Resource Sharing
- Allows frontend to call API

**dotenv** ✅
- Environment variable management
- Keeps secrets out of code

**uuid** ✅
- Generate unique IDs
- Used for share tokens, entity IDs

**qrcode** ✅
- Generate QR codes for share links

---

## 📦 Complete Backend Package List

```json
{
  "dependencies": {
    "express": "^4.18.2",           // Web framework
    "cors": "^2.8.5",                // CORS middleware
    "dotenv": "^16.3.1",             // Environment variables
    "bcryptjs": "^2.4.3",            // Password hashing
    "jsonwebtoken": "^9.0.2",        // JWT tokens
    "pg": "^8.11.3",                 // PostgreSQL client
    "multer": "^1.4.5-lts.1",        // File uploads
    "uuid": "^9.0.1",                // UUID generation
    "qrcode": "^1.5.3",              // QR code generation
    "helmet": "^7.1.0",              // Security headers
    "express-rate-limit": "^7.1.5"   // Rate limiting
  }
}
```

---

## 🏗️ Backend Architecture

### Structure
```
server/
├── src/
│   ├── server.js              # Main Express app
│   ├── db/
│   │   ├── connection.js      # PostgreSQL connection pool
│   │   ├── schema.sql         # Database schema
│   │   └── migrate.js         # Migration script
│   ├── middleware/
│   │   └── auth.js            # JWT authentication middleware
│   └── routes/
│       ├── auth.js            # Authentication routes
│       ├── portfolios.js      # Portfolio CRUD
│       ├── projects.js        # Project CRUD
│       ├── media.js           # Media upload/management
│       ├── share.js           # Sharing functionality
│       └── analytics.js       # Analytics tracking
├── uploads/                    # File storage (local)
├── package.json
└── .env                        # Environment variables
```

### API Design
- **RESTful**: Standard HTTP methods (GET, POST, PUT, DELETE)
- **JSON**: Request/response format
- **JWT**: Token-based authentication
- **Error Handling**: Consistent error responses

---

## 🔄 Alternative Backend Options (Not Used)

### Option 1: NestJS
**Pros**: TypeScript, decorators, enterprise patterns
**Cons**: More complex, learning curve
**Status**: ❌ Not chosen (Express is simpler for MVP)

### Option 2: Fastify
**Pros**: Faster than Express, modern
**Cons**: Smaller ecosystem
**Status**: ❌ Not chosen (Express has more resources)

### Option 3: MongoDB + Mongoose
**Pros**: NoSQL, flexible schema
**Cons**: Less structured, harder queries
**Status**: ❌ Not chosen (PostgreSQL better for relational data)

### Option 4: Prisma ORM
**Pros**: Type-safe, migrations, great DX
**Cons**: Additional abstraction layer
**Status**: ⚠️ Could add later for better DX

### Option 5: GraphQL (Apollo)
**Pros**: Flexible queries, single endpoint
**Cons**: More complex, overkill for REST API
**Status**: ❌ Not chosen (REST is simpler)

---

## 🚀 Why This Stack?

1. **Simple**: Easy to understand and maintain
2. **Proven**: Battle-tested technologies
3. **Fast Development**: Quick to set up and iterate
4. **Scalable**: Can handle growth
5. **Cost-Effective**: All open-source, free
6. **Flexible**: Easy to extend and modify

---

## 📊 Database Schema Highlights

### Tables
- **users**: Authentication, profiles
- **portfolios**: User portfolios
- **projects**: Portfolio items
- **media**: Images, videos, 3D models
- **share_links**: Public sharing
- **analytics_events**: Tracking data

### Features
- UUID primary keys
- Foreign key constraints
- JSONB for flexible data
- Indexes for performance
- Auto-update timestamps

---

## 🔐 Security Features

1. **Password Hashing**: bcrypt (10 rounds)
2. **JWT Tokens**: Secure, stateless auth
3. **CORS**: Controlled cross-origin access
4. **Rate Limiting**: Prevents abuse
5. **Helmet**: Security headers
6. **Input Validation**: Manual validation (could add Zod)
7. **SQL Injection Protection**: Parameterized queries (pg)

---

## 🔮 Future Enhancements

### Could Add Later:
1. **Prisma ORM**: Type-safe database access
2. **Zod**: Runtime validation
3. **Redis**: Caching, session storage
4. **AWS S3**: Cloud file storage (instead of local)
5. **Email Service**: SendGrid, Resend (for notifications)
6. **WebSockets**: Real-time features
7. **GraphQL**: If needed for complex queries

---

## 📝 Summary

**Backend Stack**: Node.js + Express.js + PostgreSQL

**Why**: 
- ✅ Simple and maintainable
- ✅ Fast to develop
- ✅ Production-ready
- ✅ Scalable
- ✅ Well-documented
- ✅ Large community

This stack is perfect for Phase 1 and can scale as needed!

