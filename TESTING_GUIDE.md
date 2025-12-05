# Testing Guide: Backend + Admin Panel

This guide will help you test both the backend API and admin panel together.

## 🚀 Quick Start

### Step 1: Start Backend Server

```bash
cd server

# Install dependencies (if not done)
npm install

# Set up database (if not done)
# 1. Create database: createdb spatial_showcase
# 2. Run migration: npm run db:migrate

# Start server
npm run dev
```

**Expected Output:**
```
🚀 Server running on port 3000
📝 Environment: development
🔗 Health check: http://localhost:3000/health
✅ Database connected
```

### Step 2: Start Admin Panel

```bash
cd admin-panel

# Install dependencies (if not done)
npm install

# Start dev server
npm run dev
```

**Expected Output:**
```
  VITE v7.2.4  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Step 3: Test Backend Health

Open browser or use curl:
```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-12-05T...",
  "environment": "development"
}
```

## 🧪 Testing Flow

### Test 1: User Registration

1. **Open Admin Panel**: http://localhost:5173
2. **Click "Sign up"** or go to `/register`
3. **Fill in form:**
   - Name: Test User
   - Email: test@example.com
   - Password: password123
   - Confirm Password: password123
4. **Click "Sign Up"**

**Expected Result:**
- ✅ Redirected to dashboard
- ✅ User logged in
- ✅ Sidebar shows user email

**Backend Check:**
```bash
# Check database
psql spatial_showcase -c "SELECT email, name FROM users;"
```

### Test 2: User Login

1. **Logout** (click logout button)
2. **Go to login page**: `/login`
3. **Enter credentials:**
   - Email: test@example.com
   - Password: password123
4. **Click "Login"**

**Expected Result:**
- ✅ Redirected to dashboard
- ✅ User logged in

### Test 3: Create Portfolio

1. **On dashboard**, click **"New Portfolio"**
2. **Fill in form:**
   - Title: My First Portfolio
   - Description: This is a test portfolio
   - Template: Creative Portfolio
3. **Click "Create Portfolio"**

**Expected Result:**
- ✅ Redirected to edit page
- ✅ Portfolio created in database

**Backend Check:**
```bash
psql spatial_showcase -c "SELECT id, title, template_id FROM portfolios;"
```

### Test 4: View Portfolios

1. **Go to Portfolios page** (sidebar → Portfolios)
2. **See your portfolio listed**

**Expected Result:**
- ✅ Portfolio card displayed
- ✅ Shows title, description, template
- ✅ "Edit" button available

### Test 5: Edit Portfolio

1. **Click "Edit"** on a portfolio
2. **Change title** to "Updated Portfolio"
3. **Toggle "Make portfolio public"**
4. **Click "Save Changes"**

**Expected Result:**
- ✅ Changes saved
- ✅ Redirected to portfolios list
- ✅ Updated data shown

**Backend Check:**
```bash
psql spatial_showcase -c "SELECT title, is_public FROM portfolios WHERE title = 'Updated Portfolio';"
```

## 🔍 API Testing (Manual)

### Test Registration API

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "api-test@example.com",
    "password": "password123",
    "name": "API Test User"
  }'
```

**Expected Response:**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "...",
    "email": "api-test@example.com",
    "name": "API Test User",
    "subscription_tier": "free"
  },
  "token": "eyJhbGc..."
}
```

### Test Login API

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "api-test@example.com",
    "password": "password123"
  }'
```

### Test Get Portfolios (with token)

```bash
# Save token from login response
TOKEN="your-token-here"

curl -X GET http://localhost:3000/api/portfolios \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "portfolios": [
    {
      "id": "...",
      "title": "My First Portfolio",
      "description": "...",
      "template_id": "creative-portfolio",
      ...
    }
  ]
}
```

## 🐛 Common Issues & Solutions

### Issue 1: Backend won't start

**Error**: `Database connection error`

**Solution**:
1. Check PostgreSQL is running: `pg_isready`
2. Verify database exists: `psql -l | grep spatial_showcase`
3. Check `.env` file has correct DB credentials
4. Run migration: `npm run db:migrate`

### Issue 2: Admin Panel can't connect to API

**Error**: `Network Error` or `CORS error`

**Solution**:
1. Verify backend is running on port 3000
2. Check `.env` file: `VITE_API_URL=http://localhost:3000/api`
3. Verify CORS in backend allows `http://localhost:5173`
4. Check browser console for specific error

### Issue 3: 401 Unauthorized

**Error**: `Access token required`

**Solution**:
1. Check token is in localStorage: Open DevTools → Application → Local Storage
2. Try logging in again
3. Check token hasn't expired
4. Verify backend JWT_SECRET is set

### Issue 4: Database errors

**Error**: `relation "users" does not exist`

**Solution**:
```bash
cd server
npm run db:migrate
```

### Issue 5: Port already in use

**Error**: `Port 3000 is already in use`

**Solution**:
1. Find process: `lsof -i :3000`
2. Kill process: `kill -9 <PID>`
3. Or change port in `server/.env`

## ✅ Checklist

### Backend
- [ ] PostgreSQL installed and running
- [ ] Database created (`spatial_showcase`)
- [ ] Migration run successfully
- [ ] Server starts without errors
- [ ] Health endpoint responds
- [ ] CORS configured correctly

### Admin Panel
- [ ] Dependencies installed
- [ ] Dev server starts
- [ ] Can access login page
- [ ] Can register new user
- [ ] Can login
- [ ] Can create portfolio
- [ ] Can view portfolios
- [ ] Can edit portfolio

### Integration
- [ ] API calls work from admin panel
- [ ] Tokens are stored correctly
- [ ] Protected routes work
- [ ] Error handling works
- [ ] Loading states show

## 📊 Expected Database State

After testing, you should have:

```sql
-- Users table
SELECT COUNT(*) FROM users;  -- Should be > 0

-- Portfolios table
SELECT COUNT(*) FROM portfolios;  -- Should be > 0

-- Check a portfolio
SELECT id, title, template_id, is_public FROM portfolios LIMIT 1;
```

## 🎯 Next Steps After Testing

Once everything works:

1. ✅ **Add Project Management** - Create/edit projects within portfolios
2. ✅ **Media Upload** - Upload images/videos for projects
3. ✅ **Template System** - Create and customize templates
4. ✅ **Sharing** - Generate share links and QR codes
5. ✅ **Analytics** - View portfolio statistics

## 📝 Notes

- Backend runs on: `http://localhost:3000`
- Admin Panel runs on: `http://localhost:5173`
- API base URL: `http://localhost:3000/api`
- Database: `spatial_showcase` (PostgreSQL)

---

**Ready to test!** Start both servers and follow the testing flow above. 🚀

