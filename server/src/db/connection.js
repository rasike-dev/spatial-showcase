import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Database connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'spatial_showcase',
  user: process.env.DB_USER || process.env.USER || 'admin', // Use system user on macOS
  password: process.env.DB_PASSWORD || '', // Usually no password for local dev
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Database connected');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

// Helper function to execute queries with timeout
export async function query(text, params, timeoutMs = 3000) {
  const start = Date.now();
  try {
    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Query timeout after ${timeoutMs}ms`)), timeoutMs);
    });

    // Race between query and timeout
    const res = await Promise.race([
      pool.query(text, params),
      timeoutPromise
    ]);

    const duration = Date.now() - start;
    console.log('Executed query', { text: text.substring(0, 100), duration, rows: res.rowCount });
    return res;
  } catch (error) {
    const duration = Date.now() - start;
    console.error('Query error:', { error: error.message, duration, text: text.substring(0, 100) });
    throw error;
  }
}

// Helper function to get a client from the pool for transactions
export function getClient() {
  return pool.connect();
}

export default pool;

