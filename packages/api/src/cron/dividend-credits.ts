import cron from 'node-cron'
import { db } from '../db/client'

export async function processDividends() {
  try {
    // Find dividend events with ex_date = today (ET)
    const { rows: events } = await db.query(
      `SELECT ticker, amount_per_share FROM dividend_events
       WHERE ex_date = (NOW() AT TIME ZONE 'America/New_York')::date
         AND credited_at IS NULL`
    )

    if (events.length === 0) return

    for (const event of events) {
      try {
        // Find all holders of this ticker (main portfolio only)
        const { rows: holders } = await db.query(
          `SELECT user_id, quantity FROM holdings
           WHERE ticker = $1
             AND agent_hire_id IS NULL
             AND challenge_id IS NULL
             AND quantity > 0`,
          [event.ticker]
        )

        for (const holder of holders) {
          const credit = Number(holder.quantity) * Number(event.amount_per_share)
          if (credit <= 0) continue

          await db.query(
            `UPDATE users SET portfolio_cash = portfolio_cash + $1, updated_at = NOW()
             WHERE id = $2`,
            [credit, holder.user_id]
          )
        }

        // Mark event as credited
        await db.query(
          `UPDATE dividend_events SET credited_at = NOW()
           WHERE ticker = $1 AND ex_date = (NOW() AT TIME ZONE 'America/New_York')::date`,
          [event.ticker]
        )

        console.log(`[dividends] credited ${event.ticker} $${event.amount_per_share}/share to ${holders.length} holders`)
      } catch (err: any) {
        console.error(`[dividends] failed for ${event.ticker}:`, err.message)
      }
    }
  } catch (err: any) {
    console.error('[dividends] processDividends failed:', err.message)
  }
}

// Run daily at 6pm ET (after market close, when dividends settle)
export function startDividendCron() {
  cron.schedule('0 18 * * 1-5', processDividends, { timezone: 'America/New_York' })
}
