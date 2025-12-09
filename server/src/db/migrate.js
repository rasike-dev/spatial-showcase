import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables - try .env.local first, then .env
dotenv.config({ path: '.env.local' });
dotenv.config(); // Fallback to .env

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate() {
  let migrationPool = null;
  
  try {
    console.log('🔄 Running database migrations...');

    // For migrations, use POSTGRES_URL_NON_POOLING if available (recommended for Neon)
    // Also check DATABASE_URL (Vercel sometimes uses this)
    // Otherwise fall back to POSTGRES_URL or individual variables
    const connectionString = process.env.POSTGRES_URL_NON_POOLING || 
                            process.env.DATABASE_URL ||
                            process.env.POSTGRES_URL || 
                            (process.env.DB_HOST ? 
                              `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}?sslmode=require` :
                              null);

    if (connectionString) {
      // Check if this is a local database (no SSL needed) or remote (SSL required)
      // Neon/Vercel databases have specific patterns
      const isNeon = connectionString.includes('neon.tech') || 
                    connectionString.includes('vercel-storage.com') ||
                    connectionString.includes('aws.neon.tech');
      const isLocalhost = connectionString.includes('localhost') || 
                         connectionString.includes('127.0.0.1');
      const isLocal = isLocalhost && !isNeon; // Only local if it's localhost AND not Neon
      const hasSslModeDisable = connectionString.includes('sslmode=disable');
      const hasSslModeRequire = connectionString.includes('sslmode=require');
      
      
      // For Neon/Vercel Postgres, ensure SSL is enabled
      let finalConnectionString = connectionString;
      
      // If connection string explicitly says sslmode=require, keep it
      // If it says sslmode=disable but it's a Neon database, fix it
      if (isNeon && hasSslModeDisable) {
        finalConnectionString = finalConnectionString.replace(/[?&]sslmode=disable/, '');
        const separator = finalConnectionString.includes('?') ? '&' : '?';
        finalConnectionString = `${finalConnectionString}${separator}sslmode=require`;
      } else if (isNeon && !connectionString.includes('sslmode=')) {
        // Add sslmode=require for Neon if not present
        const separator = finalConnectionString.includes('?') ? '&' : '?';
        finalConnectionString = `${finalConnectionString}${separator}sslmode=require`;
      }
      
      // Build pool config
      const poolConfig = {
        connectionString: finalConnectionString,
        max: 1 // Single connection for migrations
      };
      
      // SSL configuration: required for Neon/Vercel, disabled for local
      if (isNeon || (!isLocal && !hasSslModeDisable)) {
        // Remote database (Neon/Vercel) - SSL required
        poolConfig.ssl = {
          rejectUnauthorized: false // Required for Neon/Vercel Postgres
        };
      } else if (isLocal) {
        // Local database - SSL disabled
        poolConfig.ssl = false;
      }
      // If connection string has sslmode, let it handle SSL
      
      migrationPool = new Pool(poolConfig);
      console.log('✅ Using connection string for migrations');
      console.log(`📍 Database type: ${isNeon ? 'Neon (SSL required)' : isLocal ? 'Local (no SSL)' : 'Remote (SSL required)'}`);
    } else {
      // Fallback to regular pool (for local development)
      const { default: pool } = await import('./connection.js');
      migrationPool = pool;
      console.log('✅ Using default connection pool for migrations');
    }

    // Read schema file
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema
    await migrationPool.query(schema);

    // Read and execute templates file
    const templatesPath = join(__dirname, 'templates.sql');
    if (fs.existsSync(templatesPath)) {
      console.log('🔄 Running templates migration...');
      const templates = fs.readFileSync(templatesPath, 'utf8');
      await migrationPool.query(templates);
      console.log('✅ Templates migration completed');
    }

    // Read and execute migration files
    const migrationsDir = join(__dirname, 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort(); // Execute in alphabetical order

      for (const file of migrationFiles) {
        console.log(`🔄 Running migration: ${file}...`);
        const migrationPath = join(migrationsDir, file);
        const migration = fs.readFileSync(migrationPath, 'utf8');
        await migrationPool.query(migration);
        console.log(`✅ Migration ${file} completed`);
      }
    }

    console.log('✅ Database migration completed successfully');
    await migrationPool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    if (migrationPool) {
      await migrationPool.end();
    }
    process.exit(1);
  }
}

migrate();

