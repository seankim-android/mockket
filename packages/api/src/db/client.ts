import { Pool } from 'pg'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required')
  process.exit(1)
}

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

// Test connection on startup
db.query('SELECT 1').catch((err) => {
  console.error('DB connection failed:', err)
  process.exit(1)
})
