import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { db } from '../db/client'

export const activityRouter = Router()

// GET /activity — recent trades + agent trades for the current user
activityRouter.get('/', requireAuth, async (_req, res) => {
  const userId = res.locals.userId
  try {
    const { rows } = await db.query(
      `SELECT
         t.id,
         CASE WHEN t.agent_id IS NULL THEN 'trade' ELSE 'agent_trade' END AS type,
         t.agent_id,
         t.ticker,
         t.action,
         t.quantity,
         t.price_at_execution AS price,
         (t.quantity * t.price_at_execution) AS total,
         t.rationale AS quote,
         t.executed_at AS created_at
       FROM trades t
       WHERE t.user_id = $1
       ORDER BY t.executed_at DESC
       LIMIT 50`,
      [userId]
    )
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Failed to load activity' })
  }
})
