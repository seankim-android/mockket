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
  const { data } = await client.get(`/v2/stocks/${encodeURIComponent(ticker)}/quotes/latest`)
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

  const now = Date.now()
  const nextOpen = new Date(data.next_open).getTime()
  const nextClose = new Date(data.next_close).getTime()

  // Pre-market: within 5.5 hours before market open (covers 4:00am–9:30am ET extended session)
  if (now < nextOpen && nextOpen - now <= 5.5 * 60 * 60 * 1000) return 'pre-market'

  // After-hours: estimate previous close from next_open and next_close.
  // next_close - next_open gives the trading day length (typically ~6.5h).
  // prev_close ≈ next_open - (24h - tradingDayLength) for consecutive business days.
  // Note: this approximation is inaccurate over weekends (Friday close won't be detected on Sat/Sun).
  const tradingDayMs = nextClose - nextOpen
  const estPrevClose = nextOpen - (24 * 60 * 60 * 1000 - tradingDayMs)
  if (now >= estPrevClose && now - estPrevClose <= 4 * 60 * 60 * 1000) return 'after-hours'

  return 'closed'
}
