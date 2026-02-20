import { Router } from 'express'
import { db } from '../db/client'

export const webhooksRouter = Router()

// RevenueCat webhook — update premium status
webhooksRouter.post('/revenuecat', async (req, res) => {
  const authHeader = req.headers['authorization']
  if (!authHeader || authHeader !== `Bearer ${process.env.REVENUECAT_WEBHOOK_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { event } = req.body
  if (!event) return res.status(400).end()

  const userId = event.app_user_id
  if (!userId) return res.status(400).end()

  const isPremium = ['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE'].includes(event.type)
  const isExpired = ['EXPIRATION', 'CANCELLATION'].includes(event.type)

  // event_timestamp_ms is milliseconds since epoch per RevenueCat webhook spec.
  // Reject if absent — idempotency guard depends on this timestamp.
  // Requires migration: ALTER TABLE users ADD COLUMN last_rc_event_at TIMESTAMPTZ;
  if (!event.event_timestamp_ms) {
    console.warn('[revenuecat] Missing event_timestamp_ms, rejecting event:', event.type)
    return res.status(400).end()
  }
  const eventTs = new Date(event.event_timestamp_ms)

  // Idempotency: only process if this event is newer than the last processed one.
  if (isPremium) {
    await db.query(
      `UPDATE users SET is_premium = TRUE, last_rc_event_at = $1
       WHERE id = $2 AND (last_rc_event_at IS NULL OR last_rc_event_at < $1)`,
      [eventTs, userId]
    )
  } else if (isExpired) {
    await db.query(
      `UPDATE users SET is_premium = FALSE, last_rc_event_at = $1
       WHERE id = $2 AND (last_rc_event_at IS NULL OR last_rc_event_at < $1)`,
      [eventTs, userId]
    )
  } else {
    console.log('[revenuecat] Ignoring unhandled event type:', event.type)
  }

  res.status(200).end()
})
