import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { executeTrade } from '../lib/ledger'
import { getQuote, getMarketStatus } from '../lib/alpaca'
import { db } from '../db/client'
import { marcusBullChen, priyaSharma } from '@mockket/agents'
import { sendPushToUser } from '../lib/fcm'

export const tradesRouter = Router()

const AGENT_MAP: Record<string, typeof marcusBullChen> = {
  'marcus-bull-chen': marcusBullChen,
  'priya-sharma': priyaSharma,
}

// POST /trades — execute a market order
tradesRouter.post('/', requireAuth, async (req, res) => {
  const userId = res.locals.userId
  const { ticker, action, quantity, challengeId, agentHireId } = req.body

  const TICKER_RE = /^[A-Z0-9]{1,10}$/
  if (!ticker || !['buy', 'sell'].includes(action) || typeof quantity !== 'number' || quantity <= 0 || !TICKER_RE.test(ticker)) {
    return res.status(400).json({ error: 'ticker, action (buy/sell), and quantity (positive number) are required' })
  }

  // Market hours enforcement
  let marketStatus: 'open' | 'closed' | 'pre-market' | 'after-hours'
  try {
    marketStatus = await getMarketStatus()
  } catch {
    marketStatus = 'open' // fail open: don't block trades if clock check fails
  }
  if (marketStatus === 'closed') {
    return res.status(422).json({ error: 'Market is closed. Trading is only available during market hours.' })
  }
  if (marketStatus === 'pre-market' || marketStatus === 'after-hours') {
    return res.status(422).json({ error: `Market is currently in ${marketStatus}. Extended hours trading is not supported.` })
  }

  let quote
  try {
    quote = await getQuote(ticker)
  } catch {
    return res.status(400).json({ error: `Unable to get quote for ${ticker}` })
  }

  // Buy at ask, sell at bid
  const price = action === 'buy' ? quote.ask : quote.bid

  try {
    await executeTrade({ userId, ticker, action, quantity, price, challengeId, agentHireId })
  } catch (err: any) {
    if (err.message === 'Insufficient cash') {
      return res.status(400).json({ error: 'Insufficient cash to execute this trade' })
    }
    if (err.message === 'Insufficient holding quantity') {
      return res.status(400).json({ error: 'Insufficient shares to sell' })
    }
    throw err
  }

  // PDT day trade tracking — only runs if trade succeeded
  // only insert when a round-trip occurs on the same calendar day
  const oppositeAction = action === 'buy' ? 'sell' : 'buy'
  const { rows: oppRows } = await db.query(
    `SELECT id FROM trades
     WHERE user_id = $1 AND ticker = $2 AND action = $3
     AND DATE(executed_at AT TIME ZONE 'America/New_York') = (NOW() AT TIME ZONE 'America/New_York')::date
     LIMIT 1`,
    [userId, ticker, oppositeAction]
  )
  if (oppRows.length > 0) {
    // Prevent double-counting: only insert if no day_trades row exists for this ticker today
    const { rows: existingDt } = await db.query(
      `SELECT id FROM day_trades
       WHERE user_id = $1 AND ticker = $2
       AND DATE(traded_at AT TIME ZONE 'America/New_York') = (NOW() AT TIME ZONE 'America/New_York')::date
       LIMIT 1`,
      [userId, ticker]
    )
    if (existingDt.length === 0) {
      await db.query(
        `INSERT INTO day_trades (user_id, ticker) VALUES ($1, $2)`,
        [userId, ticker]
      )
    }
  }

  const { rows: dtRows } = await db.query(
    // Use 7 calendar days to safely cover the 5-business-day PDT window
    `SELECT COUNT(*) FROM day_trades
     WHERE user_id = $1 AND traded_at > NOW() - INTERVAL '7 days'`,
    [userId]
  )
  const dayTradeCount = Number(dtRows[0].count)

  res.json({ ok: true, price, executedAt: new Date().toISOString(), dayTradeCount })

  // Agent reaction triggers — run after responding (non-blocking)
  void (async () => {
    try {
      const { rows: hires } = await db.query(
        `SELECT ah.id, ah.agent_id, ah.last_reaction_at, u.portfolio_cash FROM agent_hires ah
         JOIN users u ON u.id = ah.user_id
         WHERE ah.user_id = $1 AND ah.is_active = TRUE AND ah.is_paused = FALSE`,
        [userId]
      )

      const { rows: holdingsRows } = await db.query(
        `SELECT COALESCE(SUM(quantity * avg_cost), 0) as holdings_value
         FROM holdings
         WHERE user_id = $1 AND agent_hire_id IS NULL AND challenge_id IS NULL`,
        [userId]
      )
      const holdingsValue = holdingsRows[0].holdings_value

      const tradeValue = quantity * price
      for (const hire of hires) {
        try {
          const portfolioValue = Number(hire.portfolio_cash) + Number(holdingsValue)
          const isBigTrade = portfolioValue > 0 && tradeValue / portfolioValue > 0.03

          // Check ticker overlap (agent traded this ticker in the last 7 days)
          const { rows: overlap } = await db.query(
            `SELECT id FROM trades WHERE agent_id = $1 AND ticker = $2
             AND executed_at > NOW() - INTERVAL '7 days' LIMIT 1`,
            [hire.agent_id, ticker]
          )
          const hasOverlap = overlap.length > 0

          if (!isBigTrade && !hasOverlap) continue

          // Rate limit: max 1 reaction per agent per day
          if (hire.last_reaction_at) {
            const lastReaction = new Date(hire.last_reaction_at)
            const hoursSince = (Date.now() - lastReaction.getTime()) / (1000 * 60 * 60)
            if (hoursSince < 24) continue
          }

          const agent = AGENT_MAP[hire.agent_id]
          if (!agent) continue

          const reaction = agent.react({ ticker, action, quantity, priceAtExecution: price } as any)
          await sendPushToUser(userId, agent.shortName, reaction)

          // Record reaction timestamp
          await db.query(
            `UPDATE agent_hires SET last_reaction_at = NOW() WHERE id = $1`,
            [hire.id]
          )
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
