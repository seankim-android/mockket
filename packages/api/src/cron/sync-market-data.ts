import cron from 'node-cron'
import { db } from '../db/client'
import { getQuotes } from '../lib/alpaca'
import { getDividends, getEarnings } from '../lib/polygon'

// TODO: In production, derive from all active user holdings in DB
// e.g. SELECT DISTINCT ticker FROM trades WHERE executed_at > NOW() - INTERVAL '3 months'
const TRACKED_TICKERS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'TSLA', 'META', 'JPM', 'JNJ', 'V']

export async function syncMarketData() {
  try {
    console.log('[cron] syncing market data from Polygon...')

    const [dividends, earnings] = await Promise.all([
      getDividends(TRACKED_TICKERS),
      getEarnings(TRACKED_TICKERS),
    ])

    for (const d of dividends) {
      try {
        await db.query(
          `INSERT INTO dividend_events (ticker, ex_date, amount_per_share)
           VALUES ($1, $2, $3)
           ON CONFLICT (ticker, ex_date) DO UPDATE SET amount_per_share = $3, fetched_at = NOW()`,
          [d.ticker, d.exDate, d.amountPerShare]
        )
      } catch (err: any) {
        console.error(`[cron] failed to upsert dividend for ${d.ticker}:`, err.message)
      }
    }

    for (const e of earnings) {
      try {
        await db.query(
          `INSERT INTO earnings_calendar (ticker, report_date)
           VALUES ($1, $2)
           ON CONFLICT (ticker, report_date) DO NOTHING`,
          [e.ticker, e.reportDate]
        )
      } catch (err: any) {
        console.error(`[cron] failed to upsert earnings for ${e.ticker}:`, err.message)
      }
    }

    // Refresh current prices for all tracked tickers
    try {
      const quotes = await getQuotes(TRACKED_TICKERS)
      for (const q of quotes) {
        await db.query(
          `INSERT INTO current_prices (ticker, price, updated_at) VALUES ($1, $2, NOW())
           ON CONFLICT (ticker) DO UPDATE SET price = $2, updated_at = NOW()`,
          [q.ticker, q.bid]
        )
      }
    } catch (err: any) {
      console.error('[cron] failed to refresh current_prices:', err.message)
    }

    console.log(`[cron] synced ${dividends.length} dividends, ${earnings.length} earnings events`)
  } catch (err: any) {
    console.error('[cron] syncMarketData failed:', err.message)
  }
}

// Run nightly at 2am ET
export function startMarketDataCron() {
  cron.schedule('0 2 * * *', syncMarketData, { timezone: 'America/New_York' })
}
