import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { db } from '../db/client'
import { randomBytes } from 'crypto'

export const challengesRouter = Router()

// POST /challenges — create a new challenge
challengesRouter.post('/', requireAuth, async (req, res) => {
  const userId = res.locals.userId
  const { agentId, duration, startingBalance, isPublic } = req.body

  if (!duration || !startingBalance) {
    return res.status(400).json({ error: 'duration and startingBalance required' })
  }

  const inviteToken = randomBytes(8).toString('hex')

  const { rows } = await db.query(
    `INSERT INTO challenges
       (user_id, agent_id, duration, starting_balance, status, invite_token, is_public)
     VALUES ($1, $2, $3, $4, 'active', $5, $6) RETURNING *`,
    [userId, agentId ?? null, duration, startingBalance, inviteToken, isPublic ?? false]
  )

  // Deduct starting balance from user's cash
  await db.query(
    `UPDATE users SET portfolio_cash = portfolio_cash - $1 WHERE id = $2`,
    [startingBalance, userId]
  )

  res.json(rows[0])
})

// GET /challenges/leaderboard — top 50 by all-time return
challengesRouter.get('/leaderboard', async (_req, res) => {
  const { rows } = await db.query(
    `SELECT u.display_name, u.portfolio_cash,
       ((u.portfolio_cash - 100000) / 100000 * 100) as return_pct
     FROM users u
     WHERE u.leaderboard_opt_in = TRUE
     ORDER BY return_pct DESC
     LIMIT 50`
  )
  res.json(rows)
})

// GET /challenges/invite/:token — resolve invite token (no auth required)
challengesRouter.get('/invite/:token', async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, user_id, duration, starting_balance, status, created_at
     FROM challenges WHERE invite_token = $1`,
    [req.params.token]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Invalid invite' })
  res.json(rows[0])
})

// POST /challenges/invite/:token/accept — accept a friend challenge
challengesRouter.post('/invite/:token/accept', requireAuth, async (req, res) => {
  const userId = res.locals.userId
  const { rows } = await db.query(
    `SELECT * FROM challenges WHERE invite_token = $1 AND status = 'pending'`,
    [req.params.token]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Invalid or expired invite' })

  const challenge = rows[0]
  const endsAt = new Date()
  if (challenge.duration === '1w') endsAt.setDate(endsAt.getDate() + 7)
  if (challenge.duration === '1m') endsAt.setMonth(endsAt.getMonth() + 1)

  await db.query(
    `UPDATE challenges SET opponent_user_id = $1, status = 'active',
       started_at = NOW(), ends_at = $2 WHERE id = $3`,
    [userId, endsAt, challenge.id]
  )

  res.json({ ok: true })
})

// GET /challenges — list user's challenges
challengesRouter.get('/', requireAuth, async (_req, res) => {
  const userId = res.locals.userId
  const { rows } = await db.query(
    `SELECT * FROM challenges WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  )
  res.json(rows)
})

// GET /challenges/:id — single challenge detail
challengesRouter.get('/:id', requireAuth, async (req, res) => {
  const userId = res.locals.userId
  const { rows } = await db.query(
    `SELECT * FROM challenges WHERE id = $1 AND (user_id = $2 OR opponent_user_id = $2)`,
    [req.params.id, userId]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Not found' })
  res.json(rows[0])
})
