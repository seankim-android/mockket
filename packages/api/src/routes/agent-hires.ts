import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { db } from '../db/client'

export const agentHiresRouter = Router()

// GET /agent-hires — list user's agent hires
agentHiresRouter.get('/', requireAuth, async (_req, res) => {
  const userId = res.locals.userId
  const { rows } = await db.query(
    `SELECT id, agent_id, allocated_cash, mode, is_active, is_paused, hired_at, paused_at
     FROM agent_hires WHERE user_id = $1 AND is_active = TRUE ORDER BY hired_at DESC`,
    [userId]
  )
  res.json(rows)
})

// POST /agent-hires — hire an agent
agentHiresRouter.post('/', requireAuth, async (req, res) => {
  const userId = res.locals.userId
  const { agentId, allocatedCash, mode } = req.body

  if (!agentId || typeof allocatedCash !== 'number' || allocatedCash < 1000) {
    return res.status(400).json({ error: 'agentId and allocatedCash (min $1,000) are required' })
  }

  if (!['advisory', 'autopilot'].includes(mode ?? 'advisory')) {
    return res.status(400).json({ error: 'mode must be advisory or autopilot' })
  }

  // Check max 50% of available cash
  const { rows: userRows } = await db.query(
    `SELECT portfolio_cash FROM users WHERE id = $1`,
    [userId]
  )
  if (!userRows[0]) return res.status(404).json({ error: 'User not found' })
  const maxAlloc = Number(userRows[0].portfolio_cash) * 0.5
  if (allocatedCash > maxAlloc) {
    return res.status(400).json({ error: `Allocation exceeds 50% of available cash ($${maxAlloc.toFixed(0)})` })
  }

  const { rows } = await db.query(
    `INSERT INTO agent_hires (user_id, agent_id, allocated_cash, mode, is_active, is_paused)
     VALUES ($1, $2, $3, $4, TRUE, FALSE)
     RETURNING id, agent_id, allocated_cash, mode, is_active, is_paused, hired_at`,
    [userId, agentId, allocatedCash, mode ?? 'advisory']
  )

  res.json(rows[0])
})

// DELETE /agent-hires/:id — fire agent
agentHiresRouter.delete('/:id', requireAuth, async (req, res) => {
  const userId = res.locals.userId
  const { rowCount } = await db.query(
    `UPDATE agent_hires SET is_active = FALSE WHERE id = $1 AND user_id = $2 AND is_active = TRUE`,
    [req.params.id, userId]
  )
  if ((rowCount ?? 0) === 0) return res.status(404).json({ error: 'Hire not found' })
  res.json({ ok: true })
})

// GET /agents — list available agents (metadata only)
agentHiresRouter.get('/agents', async (_req, res) => {
  res.json([
    { id: 'marcus-bull-chen', name: 'Marcus Bull Chen', shortName: 'Marcus', strategy: 'Momentum trading — ride the wave, cut the losers', riskLevel: 'high', assetClasses: ['stocks', 'crypto'], rebalanceInterval: 'daily' },
    { id: 'priya-sharma', name: 'Priya Sharma', shortName: 'Priya', strategy: 'Value investing — buy quality, hold with conviction', riskLevel: 'low', assetClasses: ['stocks'], rebalanceInterval: 'daily' },
  ])
})
