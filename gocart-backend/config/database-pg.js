const { Pool } = require('pg');
const { config } = require('./env');

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
async function connectDatabase() {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection error:', error);
    throw error;
  }
}

// Query helper function
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

// Get a client from the pool (for transactions)
async function getClient() {
  return await pool.connect();
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await pool.end();
  console.log('👋 Database pool closed');
});

module.exports = {
  pool,
  query,
  getClient,
  connectDatabase,
};


