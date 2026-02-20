import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { executeTrade } from '../lib/ledger'
import { getQuote, getMarketStatus } from '../lib/alpaca'
import { db } from '../db/client'
import { marcusBullChen, priyaSharma } from '@mockket/agents'
import { sendPushToUser } from '../lib/fcm'

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

  // Agent reaction triggers — run after responding (non-blocking)
  void (async () => {
    try {
      const { rows: hires } = await db.query(
        `SELECT ah.agent_id, u.portfolio_cash FROM agent_hires ah
         JOIN users u ON u.id = ah.user_id
         WHERE ah.user_id = $1 AND ah.is_active = TRUE AND ah.is_paused = FALSE`,
        [userId]
      )

      const tradeValue = quantity * price
      for (const hire of hires) {
        try {
          const portfolioValue = Number(hire.portfolio_cash)
          const isBigTrade = portfolioValue > 0 && tradeValue / portfolioValue > 0.03

          // Check ticker overlap (agent traded this ticker in the last 7 days)
          const { rows: overlap } = await db.query(
            `SELECT id FROM trades WHERE agent_id = $1 AND ticker = $2
             AND executed_at > NOW() - INTERVAL '7 days' LIMIT 1`,
            [hire.agent_id, ticker]
          )
          const hasOverlap = overlap.length > 0

          if (!isBigTrade && !hasOverlap) continue

          const agent = hire.agent_id === 'marcus-bull-chen' ? marcusBullChen : priyaSharma
          if (!agent) continue

          const reaction = agent.react({ ticker, action, quantity, priceAtExecution: price } as any)
          await sendPushToUser(userId, agent.shortName, reaction, undefined, db)
        } catch (err) {
          console.error(`[reactions] Failed for agent ${hire.agent_id}:`, err)
        }
      }
    } catch (err) {
      console.error('[reactions] Failed to check triggers:', err)
    }
  })()
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
