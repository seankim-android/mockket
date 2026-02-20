import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { db } from '../db/client'

export const usersRouter = Router()

// POST /users — create user profile after Supabase signup
usersRouter.post('/', requireAuth, async (req, res) => {
  const userId = res.locals.userId
  const { email, displayName } = req.body

  await db.query(
    `INSERT INTO users (id, email, display_name) VALUES ($1, $2, $3)
     ON CONFLICT (id) DO NOTHING`,
    [userId, email, displayName]
  )

  // Initialize FTUE progress
  await db.query(
    `INSERT INTO ftue_progress (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [userId]
  )

  // Initialize notification prefs
  await db.query(
    `INSERT INTO notification_prefs (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [userId]
  )

  res.json({ ok: true })
})

// GET /users/me — current user profile
usersRouter.get('/me', requireAuth, async (_req, res) => {
  const userId = res.locals.userId
  const { rows } = await db.query(
    `SELECT id, email, display_name, is_premium, portfolio_cash, reset_count, leaderboard_opt_in
     FROM users WHERE id = $1`,
    [userId]
  )
  if (!rows[0]) return res.status(404).json({ error: 'User not found' })
  res.json(rows[0])
})

// PATCH /users/me — update display name, leaderboard opt-in
usersRouter.patch('/me', requireAuth, async (req, res) => {
  const userId = res.locals.userId
  const { displayName, leaderboardOptIn } = req.body

  await db.query(
    `UPDATE users SET
       display_name = COALESCE($1, display_name),
       leaderboard_opt_in = COALESCE($2, leaderboard_opt_in),
       updated_at = NOW()
     WHERE id = $3`,
    [displayName ?? null, leaderboardOptIn ?? null, userId]
  )

  res.json({ ok: true })
})

// DELETE /users/me — delete account
usersRouter.delete('/me', requireAuth, async (_req, res) => {
  const userId = res.locals.userId
  // Soft delete: just clear personal data, preserve trade history integrity
  await db.query(
    `UPDATE users SET display_name = '[deleted]', email = NULL, updated_at = NOW() WHERE id = $1`,
    [userId]
  )
  res.json({ ok: true })
})

// GET /users/ftue — FTUE progress
usersRouter.get('/ftue', requireAuth, async (_req, res) => {
  const userId = res.locals.userId
  const { rows } = await db.query(
    `SELECT * FROM ftue_progress WHERE user_id = $1`,
    [userId]
  )
  res.json(rows[0] ?? {})
})

// PATCH /users/ftue — update FTUE progress
usersRouter.patch('/ftue', requireAuth, async (req, res) => {
  const userId = res.locals.userId
  const fields = req.body as Record<string, unknown>

  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ error: 'No fields provided' })
  }

  const setClauses = Object.keys(fields)
    .map((k, i) => `${k} = $${i + 2}`)
    .join(', ')

  await db.query(
    `UPDATE ftue_progress SET ${setClauses} WHERE user_id = $1`,
    [userId, ...Object.values(fields)]
  )

  res.json({ ok: true })
})

// POST /users/fcm-token — register device push token
usersRouter.post('/fcm-token', requireAuth, async (req, res) => {
  const userId = res.locals.userId
  const { token, platform } = req.body

  if (!token || !platform) {
    return res.status(400).json({ error: 'token and platform are required' })
  }

  await db.query(
    `INSERT INTO fcm_tokens (user_id, token, platform)
     VALUES ($1, $2, $3) ON CONFLICT (token) DO NOTHING`,
    [userId, token, platform]
  )

  res.json({ ok: true })
})

// POST /portfolio/reset — IAP-gated portfolio reset
usersRouter.post('/portfolio/reset', requireAuth, async (_req, res) => {
  const userId = res.locals.userId

  // Block if any active challenge
  const { rows: activeChallenges } = await db.query(
    `SELECT id FROM challenges WHERE user_id = $1 AND status = 'active' LIMIT 1`,
    [userId]
  )
  if (activeChallenges.length > 0) {
    return res.status(400).json({ error: 'Cannot reset while an active challenge is running' })
  }

  // Reset cash, pause all agent hires, increment reset_count
  await db.query(
    `UPDATE users SET portfolio_cash = 100000, reset_count = reset_count + 1, updated_at = NOW()
     WHERE id = $1`,
    [userId]
  )
  await db.query(
    `UPDATE agent_hires SET is_paused = TRUE, paused_at = NOW()
     WHERE user_id = $1 AND is_active = TRUE`,
    [userId]
  )

  res.json({ ok: true })
})
