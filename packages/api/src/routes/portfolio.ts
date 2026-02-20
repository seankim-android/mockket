import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { getPortfolio } from '../lib/ledger'
import { db } from '../db/client'

export const portfolioRouter = Router()

// GET /portfolio — returns cash + holdings + basic P&L
portfolioRouter.get('/', requireAuth, async (_req, res) => {
  const userId = res.locals.userId
  const portfolio = await getPortfolio(userId)

  // Fetch all-time trades for P&L annotation
  const { rows: trades } = await db.query(
    `SELECT ticker, action, quantity, price_at_execution, executed_at
     FROM trades WHERE user_id = $1 ORDER BY executed_at DESC LIMIT 100`,
    [userId]
  )

  res.json({ ...portfolio, recentTrades: trades })
})
