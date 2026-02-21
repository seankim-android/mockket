import { Router } from 'express'
import { getEarnings } from '../lib/polygon'

export const marketsRouter = Router()

// GET /markets/earnings?tickers=AAPL,TSLA,MSFT
// Returns a map of tickers that have earnings within ±7 days of today.
marketsRouter.get('/earnings', async (req, res) => {
  const raw = req.query.tickers
  if (!raw || typeof raw !== 'string') {
    res.status(400).json({ error: 'tickers query param is required' })
    return
  }

  const tickers = raw
    .split(',')
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean)

  if (tickers.length === 0) {
    res.status(400).json({ error: 'tickers query param is empty' })
    return
  }

  try {
    const events = await getEarnings(tickers)
    const now = Date.now()
    const windowMs = 7 * 24 * 60 * 60 * 1000

    const result: Record<string, { reportsAt: string; isWithin7Days: boolean }> = {}

    for (const event of events) {
      const reportMs = new Date(event.reportDate).getTime()
      const diff = Math.abs(reportMs - now)
      if (diff <= windowMs) {
        // If the ticker already has an entry keep the one closest to today
        const existing = result[event.ticker]
        if (!existing || diff < Math.abs(new Date(existing.reportsAt).getTime() - now)) {
          result[event.ticker] = { reportsAt: event.reportDate, isWithin7Days: true }
        }
      }
    }

    res.json(result)
  } catch {
    res.status(500).json({ error: 'Failed to fetch earnings data' })
  }
})
