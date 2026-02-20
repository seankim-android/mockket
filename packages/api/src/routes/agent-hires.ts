import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { db } from '../db/client'

export const agentHiresRouter = Router()

const KNOWN_AGENTS = new Set(['marcus-bull-chen', 'priya-sharma'])

// GET /agents — list available agents (metadata only)
// IMPORTANT: must be registered before /:id to avoid Express swallowing it as a param
agentHiresRouter.get('/agents', async (_req, res) => {
  res.json([
    { id: 'marcus-bull-chen', name: 'Marcus Bull Chen', shortName: 'Marcus', strategy: 'Momentum trading — ride the wave, cut the losers', riskLevel: 'high', assetClasses: ['stocks', 'crypto'], rebalanceInterval: 'daily' },
    { id: 'priya-sharma', name: 'Priya Sharma', shortName: 'Priya', strategy: 'Value investing — buy quality, hold with conviction', riskLevel: 'low', assetClasses: ['stocks'], rebalanceInterval: 'daily' },
  ])
})

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

  if (!agentId || !KNOWN_AGENTS.has(agentId)) {
    return res.status(400).json({ error: 'agentId must be a known agent' })
  }

  if (typeof allocatedCash !== 'number' || allocatedCash < 1000) {
    return res.status(400).json({ error: 'allocatedCash must be a number and at least $1,000' })
  }

  if (!['advisory', 'autopilot'].includes(mode ?? 'advisory')) {
    return res.status(400).json({ error: 'mode must be advisory or autopilot' })
  }

  // Wrap allocation check + duplicate check + INSERT in a transaction to prevent TOCTOU races
  const client = await db.connect()
  try {
    await client.query('BEGIN')

    // Lock the user row to serialize concurrent hire requests for the same user
    const { rows: userRows } = await client.query(
      `SELECT u.id, u.portfolio_cash,
         COALESCE(SUM(ah.allocated_cash), 0) AS existing_allocations
       FROM users u
       LEFT JOIN agent_hires ah ON ah.user_id = u.id AND ah.is_active = TRUE AND ah.is_paused = FALSE
       WHERE u.id = $1
       GROUP BY u.id`,
      [userId]
    )
    if (!userRows[0]) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'User not found' })
    }
    const availableCash = Number(userRows[0].portfolio_cash) - Number(userRows[0].existing_allocations)
    const maxAlloc = availableCash * 0.5
    if (allocatedCash > maxAlloc) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: `Allocation exceeds 50% of available unallocated cash ($${maxAlloc.toFixed(0)})` })
    }

    const { rows: existingHire } = await client.query(
      `SELECT id FROM agent_hires WHERE user_id = $1 AND agent_id = $2 AND is_active = TRUE LIMIT 1`,
      [userId, agentId]
    )
    if (existingHire.length > 0) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'You already have an active hire for this agent' })
    }

    const { rows } = await client.query(
      `INSERT INTO agent_hires (user_id, agent_id, allocated_cash, mode, is_active, is_paused)
       VALUES ($1, $2, $3, $4, TRUE, FALSE)
       RETURNING id, agent_id, allocated_cash, mode, is_active, is_paused, hired_at`,
      [userId, agentId, allocatedCash, mode ?? 'advisory']
    )

    await client.query('COMMIT')
    res.json(rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
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
