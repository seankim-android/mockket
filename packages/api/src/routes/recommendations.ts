import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { db } from '../db/client'
import { executeTrade } from '../lib/ledger'
import { getQuote } from '../lib/alpaca'

export const recommendationsRouter = Router()

// GET /recommendations/:id/preview — NO rationale returned (by design)
recommendationsRouter.get('/:id/preview', requireAuth, async (req, res) => {
  const userId = res.locals.userId
  const { rows } = await db.query(
    `SELECT id, agent_id, ticker, action, quantity, status, expires_at, created_at
     FROM agent_recommendations
     WHERE id = $1 AND user_id = $2`,
    [req.params.id, userId]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Not found' })
  // Note: rationale deliberately excluded from this endpoint
  res.json(rows[0])
})

// GET /recommendations/:id/rationale — only after action taken
recommendationsRouter.get('/:id/rationale', requireAuth, async (req, res) => {
  const userId = res.locals.userId
  const { rows } = await db.query(
    `SELECT rationale, status, acted_at FROM agent_recommendations
     WHERE id = $1 AND user_id = $2`,
    [req.params.id, userId]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Not found' })
  if (rows[0].status === 'pending' || rows[0].status === 'expired') {
    return res.status(403).json({ error: 'Rationale not available yet' })
  }
  res.json({ rationale: rows[0].rationale, actedAt: rows[0].acted_at })
})

// PATCH /recommendations/:id — approve or reject
recommendationsRouter.patch('/:id', requireAuth, async (req, res) => {
  const userId = res.locals.userId
  const { action } = req.body // 'approved' | 'rejected'

  if (!['approved', 'rejected'].includes(action)) {
    return res.status(400).json({ error: 'action must be approved or rejected' })
  }

  const { rows } = await db.query(
    `SELECT * FROM agent_recommendations
     WHERE id = $1 AND user_id = $2 AND status = 'pending'`,
    [req.params.id, userId]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Not found or already acted on' })

  const rec = rows[0]
  if (new Date(rec.expires_at) < new Date()) {
    return res.status(400).json({ error: 'Recommendation has expired' })
  }

  await db.query(
    `UPDATE agent_recommendations SET status = $1, acted_at = NOW() WHERE id = $2`,
    [action, rec.id]
  )

  if (action === 'approved') {
    const quote = await getQuote(rec.ticker)
    const price = rec.action === 'buy' ? quote.ask : quote.bid
    await executeTrade({
      userId,
      agentId: rec.agent_id,
      agentHireId: rec.agent_hire_id,
      ticker: rec.ticker,
      action: rec.action,
      quantity: Number(rec.quantity),
      price,
      rationale: rec.rationale, // stored in trade, not shown to user until post-action
      challengeId: rec.challenge_id,
    })
  }

  res.json({ ok: true })
})

// GET /recommendations — list pending recommendations for user (no rationale)
recommendationsRouter.get('/', requireAuth, async (_req, res) => {
  const userId = res.locals.userId
  const { rows } = await db.query(
    `SELECT id, agent_id, ticker, action, quantity, status, expires_at, created_at
     FROM agent_recommendations
     WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [userId]
  )
  res.json(rows)
})
