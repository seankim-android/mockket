import { Router } from 'express'
import { db } from '../db/client'
import { getMarketStatus } from '../lib/alpaca'

export const configRouter = Router()

// GET /config/app-version?platform=ios|android
configRouter.get('/app-version', async (req, res) => {
  const platform = req.query.platform as string // 'ios' | 'android'
  const { rows } = await db.query(
    `SELECT version, minimum_version, update_mode FROM app_versions
     WHERE platform = $1 OR platform = 'both'
     ORDER BY created_at DESC LIMIT 1`,
    [platform]
  )

  if (!rows[0]) return res.json({ minimumVersion: '1.0.0', latestVersion: '1.0.0', updateMode: null })

  res.json({
    minimumVersion: rows[0].minimum_version,
    latestVersion: rows[0].version,
    updateMode: rows[0].update_mode,
  })
})

// GET /config/earnings?tickers=AAPL,MSFT
configRouter.get('/earnings', async (req, res) => {
  const tickersParam = req.query.tickers as string | undefined
  if (!tickersParam) return res.status(400).json({ error: 'tickers query param required' })

  const tickers = tickersParam.split(',').map(t => t.trim().toUpperCase()).filter(Boolean)
  if (tickers.length === 0 || tickers.length > 50) {
    return res.status(400).json({ error: 'Provide 1–50 tickers' })
  }

  try {
    const { rows } = await db.query(
      `SELECT ticker, report_date
       FROM earnings_calendar
       WHERE ticker = ANY($1)
         AND report_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
       ORDER BY report_date ASC`,
      [tickers]
    )

    // Return as { AAPL: '2026-02-25', ... }
    const result: Record<string, string> = {}
    for (const row of rows) {
      result[row.ticker] = row.report_date
    }
    res.json(result)
  } catch {
    res.status(500).json({ error: 'Failed to fetch earnings' })
  }
})

// GET /config/changelog?version=1.2.0
configRouter.get('/changelog', async (req, res) => {
  const { version } = req.query
  const { rows } = await db.query(
    `SELECT ce.type, ce.text, ce.sort_order
     FROM changelog_entries ce
     JOIN app_versions av ON av.id = ce.app_version_id
     WHERE av.version = $1
     ORDER BY ce.sort_order`,
    [version]
  )
  res.json(rows)
})

// GET /config/market-status
configRouter.get('/market-status', async (_req, res) => {
  try {
    const marketStatus = await getMarketStatus()
    res.json({ marketStatus })
  } catch {
    res.json({ marketStatus: 'unknown' })
  }
})
