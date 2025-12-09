import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate() {
  let migrationPool = null;
  
  try {
    console.log('🔄 Running database migrations...');

    // For migrations, use POSTGRES_URL_NON_POOLING if available (recommended for Neon)
    // Otherwise fall back to POSTGRES_URL or individual variables
    const connectionString = process.env.POSTGRES_URL_NON_POOLING || 
                            process.env.POSTGRES_URL || 
                            (process.env.DB_HOST ? 
                              `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}?sslmode=require` :
                              null);

    if (connectionString) {
      migrationPool = new Pool({
        connectionString: connectionString,
        ssl: {
          rejectUnauthorized: false // Required for Neon/Vercel Postgres
        },
        max: 1 // Single connection for migrations
      });
      console.log('✅ Using connection string for migrations');
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

