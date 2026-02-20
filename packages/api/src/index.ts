import 'express-async-errors'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { errorHandler } from './middleware/error'

dotenv.config()

const app = express()
const PORT = process.env.PORT ?? 3000

app.use(helmet())
app.use(cors({ origin: '*' })) // tighten in production
app.use(express.json())

// Health check
app.get('/health', (_req, res) => res.json({ ok: true }))

// Routes (added in later tasks)

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Mockket API running on port ${PORT}`)
})
