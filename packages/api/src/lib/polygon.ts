import axios from 'axios'

const client = axios.create({
  baseURL: 'https://api.polygon.io',
  params: { apiKey: process.env.POLYGON_API_KEY },
})

export interface DividendEvent {
  ticker: string
  exDate: string // ISO date
  amountPerShare: number
}

export interface EarningsEvent {
  ticker: string
  reportDate: string // ISO date
}

// Fetch upcoming dividends for a list of tickers
export async function getDividends(tickers: string[]): Promise<DividendEvent[]> {
  const results: DividendEvent[] = []
  await Promise.all(
    tickers.map(async (ticker) => {
      try {
        const { data } = await client.get('/v3/reference/dividends', {
          params: { ticker, limit: 5 },
        })
        if (!Array.isArray(data.results)) return
        for (const d of data.results) {
          results.push({ ticker, exDate: d.ex_dividend_date, amountPerShare: d.cash_amount })
        }
      } catch (err: any) {
        console.error(`[polygon] getDividends failed for ${ticker}:`, err.message)
      }
    })
  )
  return results
}

// Fetch upcoming earnings announcement dates
export async function getEarnings(tickers: string[]): Promise<EarningsEvent[]> {
  const results: EarningsEvent[] = []
  await Promise.all(
    tickers.map(async (ticker) => {
      try {
        const { data } = await client.get('/v3/reference/earnings', {
          params: { ticker, limit: 10 },
        })
        if (!Array.isArray(data.results)) return
        for (const e of data.results) {
          results.push({ ticker, reportDate: e.report_date })
        }
      } catch (err: any) {
        console.error(`[polygon] getEarnings failed for ${ticker}:`, err.message)
      }
    })
  )
  return results
}

export interface SplitEvent {
  ticker: string
  effectiveDate: string  // ISO date string
  ratio: number          // new_shares / old_shares
}

export async function getSplits(tickers: string[]): Promise<SplitEvent[]> {
  const results: SplitEvent[] = []
  await Promise.all(
    tickers.map(async (ticker) => {
      try {
        const { data } = await client.get('/v3/reference/splits', {
          params: { ticker, limit: 10 },
        })
        if (!Array.isArray(data.results)) return
        for (const s of data.results) {
          const ratio = s.split_to / s.split_from
          if (ratio <= 0) continue
          results.push({ ticker: s.ticker, effectiveDate: s.execution_date, ratio })
        }
      } catch (err: any) {
        console.error(`[polygon] getSplits failed for ${ticker}:`, err.message)
      }
    })
  )
  return results
}
