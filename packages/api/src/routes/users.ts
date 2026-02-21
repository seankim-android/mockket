import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { db } from '../db/client'
import { getPortfolioResetTransactionIds } from '../lib/revenuecat'

export const usersRouter = Router()

// POST /users — create user profile after Supabase signup
usersRouter.post('/', requireAuth, async (req, res) => {
  const userId = res.locals.userId
  const { email, displayName } = req.body

  const trimmedName = typeof displayName === 'string' ? displayName.trim() : ''
  if (!trimmedName || trimmedName.length > 50) {
    return res.status(400).json({ error: 'displayName must be a non-empty string (max 50 characters)' })
  }
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'email must be a valid email address' })
  }

  await db.query(
    `INSERT INTO users (id, email, display_name) VALUES ($1, $2, $3)
     ON CONFLICT (id) DO NOTHING`,
    [userId, email, trimmedName]
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

  // Schedule Marcus intro push 2 minutes after account creation
  await db.query(
    `INSERT INTO scheduled_jobs (job_type, payload, run_at)
     VALUES ('marcus_intro', $1, NOW() + INTERVAL '2 minutes')`,
    [JSON.stringify({ userId })]
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

  if (displayName !== undefined) {
    const trimmed = typeof displayName === 'string' ? displayName.trim() : ''
    if (!trimmed || trimmed.length > 50) {
      return res.status(400).json({ error: 'displayName must be a non-empty string (max 50 characters)' })
    }
  }
  if (leaderboardOptIn !== undefined && typeof leaderboardOptIn !== 'boolean') {
    return res.status(400).json({ error: 'leaderboardOptIn must be a boolean' })
  }

  await db.query(
    `UPDATE users SET
       display_name = COALESCE($1, display_name),
       leaderboard_opt_in = COALESCE($2, leaderboard_opt_in),
       updated_at = NOW()
     WHERE id = $3`,
    [displayName !== undefined ? (displayName as string).trim() : null, leaderboardOptIn ?? null, userId]
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

const ALLOWED_FTUE_FIELDS = new Set([
  'viewed_marcus_profile', 'made_first_trade', 'started_challenge',
  'agent_intro_sent', 'first_trade_annotation_shown', 'day2_card_shown'
])

// PATCH /users/ftue — update FTUE progress
usersRouter.patch('/ftue', requireAuth, async (req, res) => {
  const userId = res.locals.userId
  const fields = req.body as Record<string, unknown>

  const safeEntries = Object.entries(fields).filter(([k]) => ALLOWED_FTUE_FIELDS.has(k))

  if (safeEntries.length === 0) {
    return res.status(400).json({ error: 'No valid fields provided' })
  }

  const setClauses = safeEntries
    .map(([k], i) => `${k} = $${i + 2}`)
    .join(', ')

  await db.query(
    `UPDATE ftue_progress SET ${setClauses} WHERE user_id = $1`,
    [userId, ...safeEntries.map(([, v]) => v)]
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

  // Verify purchase server-side via RevenueCat REST API before opening a transaction.
  // We fetch all transaction IDs for this user, then find one that hasn't been consumed yet.
  const allTxIds = await getPortfolioResetTransactionIds(userId)
  if (allTxIds.length === 0) {
    return res.status(402).json({ error: 'Purchase required to reset portfolio' })
  }

  // Check which transaction IDs have already been consumed
  const { rows: usedRows } = await db.query(
    `SELECT rc_transaction_id FROM portfolio_reset_receipts WHERE user_id = $1`,
    [userId]
  )
  const usedIds = new Set(usedRows.map((r: { rc_transaction_id: string }) => r.rc_transaction_id))
  const unusedTxId = allTxIds.find((id) => !usedIds.has(id))

  if (!unusedTxId) {
    return res.status(402).json({ error: 'Purchase required to reset portfolio' })
  }

  const client = await db.connect()
  try {
    await client.query('BEGIN')

    // Consume the receipt atomically inside the transaction (UNIQUE constraint prevents double-spend)
    await client.query(
      `INSERT INTO portfolio_reset_receipts (user_id, rc_transaction_id) VALUES ($1, $2)`,
      [userId, unusedTxId]
    )

    // Block if any active challenge — checked inside transaction to prevent TOCTOU
    const { rows: activeChallenges } = await client.query(
      `SELECT id FROM challenges WHERE user_id = $1 AND status = 'active' LIMIT 1`,
      [userId]
    )
    if (activeChallenges.length > 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Cannot reset while an active challenge is running' })
    }

    // Reset cash and increment reset_count
    await client.query(
      `UPDATE users SET portfolio_cash = 100000, reset_count = reset_count + 1, updated_at = NOW()
       WHERE id = $1`,
      [userId]
    )

    // Pause all active agent hires
    await client.query(
      `UPDATE agent_hires SET is_paused = TRUE, paused_at = NOW()
       WHERE user_id = $1 AND is_active = TRUE`,
      [userId]
    )

    // Clear main portfolio holdings (preserve agent and challenge holdings)
    await client.query(
      `DELETE FROM holdings WHERE user_id = $1 AND agent_hire_id IS NULL AND challenge_id IS NULL`,
      [userId]
    )

    await client.query('COMMIT')
    res.json({ ok: true })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})
