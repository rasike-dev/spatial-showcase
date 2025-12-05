# Database Setup Guide

## Issue: PostgreSQL Not Running

The error `ECONNREFUSED` on port 5432 means PostgreSQL is not running.

## Quick Fix

### Option 1: Start PostgreSQL (macOS with Homebrew)

```bash
# Start PostgreSQL service
brew services start postgresql@14
# OR
brew services start postgresql

# Check if it's running
pg_isready
```

### Option 2: Start PostgreSQL (Linux)

```bash
# Start PostgreSQL service
sudo systemctl start postgresql
# OR
sudo service postgresql start

# Check status
sudo systemctl status postgresql
```

### Option 3: Start PostgreSQL (Windows)

1. Open Services (Win+R, type `services.msc`)
2. Find "PostgreSQL" service
3. Right-click → Start

## Verify Database Exists

```bash
# Connect to PostgreSQL
psql postgres

# List databases
\l

# Check if spatial_showcase exists
# If not, create it:
CREATE DATABASE spatial_showcase;

# Exit
\q
```

## Run Database Migration

```bash
cd server
npm run db:migrate
```

## Test Connection

```bash
# Test connection
psql -h localhost -U postgres -d spatial_showcase -c "SELECT 1;"
```

## Common Issues

### PostgreSQL not installed
```bash
# macOS
brew install postgresql@14

# Linux (Ubuntu/Debian)
sudo apt-get install postgresql postgresql-contrib

# Linux (CentOS/RHEL)
sudo yum install postgresql-server postgresql-contrib
```

### Wrong port
Check PostgreSQL config:
```bash
# Find config file
psql -U postgres -c "SHOW config_file;"

# Or check default location
# macOS: /usr/local/var/postgres/postgresql.conf
# Linux: /etc/postgresql/*/main/postgresql.conf
```

### Permission issues
```bash
# Create user if needed
createuser -s postgres
```

## After Setup

1. ✅ PostgreSQL running
2. ✅ Database `spatial_showcase` exists
3. ✅ Migration run successfully
4. ✅ Backend can connect

Then restart the backend server:
```bash
cd server
npm run dev
```

