import { Pool } from 'pg'

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
})

// Test connection on startup
db.query('SELECT 1').catch((err) => {
  console.error('DB connection failed:', err)
  process.exit(1)
})
