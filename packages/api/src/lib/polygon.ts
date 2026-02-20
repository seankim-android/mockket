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
