import cron from 'node-cron'
import { db } from '../db/client'

export async function applySplitAdjustments() {
  try {
    const { rows: splits } = await db.query(
      `SELECT id, ticker, ratio FROM split_events
       WHERE effective_date = (NOW() AT TIME ZONE 'America/New_York')::date
         AND applied_at IS NULL`
    )

    for (const split of splits) {
      if (Number(split.ratio) <= 0) {
        console.error(`[splits] skipping ${split.ticker}: invalid ratio ${split.ratio}`)
        continue
      }
      const client = await db.connect()
      try {
        await client.query('BEGIN')

        // Adjust all holdings: new quantity = floor(old * ratio), new avg_cost = old / ratio
        await client.query(
          `UPDATE holdings
           SET quantity = FLOOR(quantity * $1),
               avg_cost = avg_cost / $1
           WHERE ticker = $2 AND quantity > 0`,
          [split.ratio, split.ticker]
        )

        // Remove zero-quantity holdings created by floor rounding
        await client.query(
          `DELETE FROM holdings WHERE ticker = $1 AND quantity = 0`,
          [split.ticker]
        )

        await client.query(
          `UPDATE split_events SET applied_at = NOW() WHERE id = $1`,
          [split.id]
        )

        await client.query('COMMIT')
        console.log(`[splits] applied ${split.ticker} split (ratio ${split.ratio})`)
      } catch (err) {
        await client.query('ROLLBACK')
        console.error(`[splits] failed for ${split.ticker}:`, err)
      } finally {
        client.release()
      }
    }
  } catch (err: any) {
    console.error('[splits] applySplitAdjustments failed:', err.message)
  }
}

// Run at 9:00am ET on trading days (before market open)
export function startSplitCron() {
  cron.schedule('0 9 * * 1-5', applySplitAdjustments, { timezone: 'America/New_York' })
}
