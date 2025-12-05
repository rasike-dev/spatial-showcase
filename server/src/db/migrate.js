import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate() {
  try {
    console.log('🔄 Running database migrations...');

    // Read schema file
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema
    await pool.query(schema);

    // Read and execute templates file
    const templatesPath = join(__dirname, 'templates.sql');
    if (fs.existsSync(templatesPath)) {
      console.log('🔄 Running templates migration...');
      const templates = fs.readFileSync(templatesPath, 'utf8');
      await pool.query(templates);
      console.log('✅ Templates migration completed');
    }

    console.log('✅ Database migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();

