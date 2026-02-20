import axios from 'axios'

const client = axios.create({
  baseURL: process.env.ALPACA_BASE_URL,
  headers: {
    'APCA-API-KEY-ID': process.env.ALPACA_API_KEY!,
    'APCA-API-SECRET-KEY': process.env.ALPACA_API_SECRET!,
  },
})

export interface Quote {
  ticker: string
  ask: number
  bid: number
  mid: number
}

// Fetch latest quote for a single ticker
export async function getQuote(ticker: string): Promise<Quote> {
  const { data } = await client.get(`/v2/stocks/${ticker}/quotes/latest`)
  const q = data.quote
  const ask = q.ap  // ask price
  const bid = q.bp  // bid price
  return {
    ticker,
    ask,
    bid,
    mid: (ask + bid) / 2,
  }
}

// Fetch quotes for multiple tickers
export async function getQuotes(tickers: string[]): Promise<Quote[]> {
  const symbols = tickers.join(',')
  const { data } = await client.get(`/v2/stocks/quotes/latest?symbols=${symbols}`)
  return Object.entries(data.quotes).map(([ticker, q]: [string, any]) => ({
    ticker,
    ask: q.ap,
    bid: q.bp,
    mid: (q.ap + q.bp) / 2,
  }))
}

// Check if market is currently open
export async function getMarketStatus(): Promise<'open' | 'closed' | 'pre-market' | 'after-hours'> {
  const { data } = await client.get('/v1/clock')
  if (data.is_open) return 'open'
  // Determine pre-market / after-hours by ET hour
  const now = new Date()
  const etHour = parseInt(new Intl.DateTimeFormat('en-US', {
    hour: 'numeric', hour12: false, timeZone: 'America/New_York'
  }).format(now))
  if (etHour >= 4 && etHour <= 9) return 'pre-market'   // 4 AM – 9:59 AM (market opens at 9:30)
  if (etHour >= 16 && etHour <= 20) return 'after-hours' // 4 PM – 8:59 PM
  return 'closed'
}
