import cron from 'node-cron'
import { db } from '../db/client'
import { getDividends, getEarnings } from '../lib/polygon'

// The tickers we track — in production, derive from all user holdings
const TRACKED_TICKERS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'TSLA', 'META', 'JPM', 'JNJ', 'V']

export async function syncMarketData() {
  console.log('[cron] syncing market data from Polygon...')

  const [dividends, earnings] = await Promise.all([
    getDividends(TRACKED_TICKERS),
    getEarnings(TRACKED_TICKERS),
  ])

  // Upsert dividends
  for (const d of dividends) {
    await db.query(
      `INSERT INTO dividend_events (ticker, ex_date, amount_per_share)
       VALUES ($1, $2, $3)
       ON CONFLICT (ticker, ex_date) DO UPDATE SET amount_per_share = $3, fetched_at = NOW()`,
      [d.ticker, d.exDate, d.amountPerShare]
    )
  }

  // Upsert earnings
  for (const e of earnings) {
    await db.query(
      `INSERT INTO earnings_calendar (ticker, report_date)
       VALUES ($1, $2)
       ON CONFLICT (ticker, report_date) DO NOTHING`,
      [e.ticker, e.reportDate]
    )
  }

  console.log(`[cron] synced ${dividends.length} dividends, ${earnings.length} earnings events`)
}

// Run nightly at 2am ET
export function startMarketDataCron() {
  cron.schedule('0 2 * * *', syncMarketData, { timezone: 'America/New_York' })
}
