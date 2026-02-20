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
  for (const ticker of tickers) {
    const { data } = await client.get(`/v3/reference/dividends`, {
      params: { ticker, limit: 5 },
    })
    for (const d of data.results ?? []) {
      results.push({
        ticker,
        exDate: d.ex_dividend_date,
        amountPerShare: d.cash_amount,
      })
    }
  }
  return results
}

// Fetch upcoming earnings dates
export async function getEarnings(tickers: string[]): Promise<EarningsEvent[]> {
  const results: EarningsEvent[] = []
  for (const ticker of tickers) {
    const { data } = await client.get(`/vX/reference/financials`, {
      params: { ticker, limit: 2 },
    })
    for (const e of data.results ?? []) {
      results.push({ ticker, reportDate: e.period_of_report_date })
    }
  }
  return results
}
