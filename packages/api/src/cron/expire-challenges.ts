import cron from 'node-cron'
import { db } from '../db/client'

async function expirePendingChallenges() {
  // Find pending challenges older than 24h
  const { rows: expired } = await db.query(
    `SELECT id, user_id, starting_balance FROM challenges
     WHERE status = 'pending' AND created_at < NOW() - INTERVAL '24 hours'`
  )

  for (const challenge of expired) {
    const client = await db.connect()
    try {
      await client.query('BEGIN')

      // Mark as expired
      const { rowCount } = await client.query(
        `UPDATE challenges SET status = 'expired'
         WHERE id = $1 AND status = 'pending'`,
        [challenge.id]
      )

      // Only refund if we actually updated (guards against concurrent runs)
      if ((rowCount ?? 0) > 0) {
        await client.query(
          `UPDATE users SET portfolio_cash = portfolio_cash + $1, updated_at = NOW()
           WHERE id = $2`,
          [challenge.starting_balance, challenge.user_id]
        )
      }

      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      console.error(`[expire-challenges] Failed for challenge ${challenge.id}:`, err)
    } finally {
      client.release()
    }
  }

  if (expired.length > 0) {
    console.log(`[expire-challenges] Expired ${expired.length} pending challenges`)
  }
}

// Run every hour
export function startExpireChallengesCron() {
  cron.schedule('0 * * * *', async () => {
    try {
      await expirePendingChallenges()
    } catch (err) {
      console.error('[expire-challenges] Cron failed:', err)
    }
  })
}
