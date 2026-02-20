import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { executeTrade } from '../lib/ledger'
import { getQuote, getMarketStatus } from '../lib/alpaca'
import { db } from '../db/client'

export const tradesRouter = Router()

// POST /trades — execute a market order
tradesRouter.post('/', requireAuth, async (req, res) => {
  const userId = res.locals.userId
  const { ticker, action, quantity, challengeId, agentHireId } = req.body

  if (!ticker || !['buy', 'sell'].includes(action) || typeof quantity !== 'number' || quantity <= 0) {
    return res.status(400).json({ error: 'ticker, action (buy/sell), and quantity (positive number) are required' })
  }

  const status = await getMarketStatus()
  const quote = await getQuote(ticker)

  // Buy at ask, sell at bid
  const price = action === 'buy' ? quote.ask : quote.bid

  // TODO: after-hours order queuing — for MVP, execute immediately at current price (paper trading)
  void status // suppress unused-var; status used in future queuing logic

  await executeTrade({ userId, ticker, action, quantity, price, challengeId, agentHireId })

  // Record day trade entry for PDT warning tracking
  await db.query(
    `INSERT INTO day_trades (user_id, ticker) VALUES ($1, $2)`,
    [userId, ticker]
  )

  res.json({ ok: true, price, executedAt: new Date().toISOString() })
})

// GET /trades — trade history for current user
tradesRouter.get('/', requireAuth, async (req, res) => {
  const userId = res.locals.userId
  const { rows } = await db.query(
    `SELECT * FROM trades WHERE user_id = $1 ORDER BY executed_at DESC LIMIT 50`,
    [userId]
  )
  res.json(rows)
})
