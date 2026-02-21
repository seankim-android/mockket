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

  const now = new Date()

  // Get current time-of-day in ET using spec-compliant Intl.DateTimeFormat
  const timeParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now)
  const hours = Number(timeParts.find(p => p.type === 'hour')?.value ?? 0)
  const minutes = Number(timeParts.find(p => p.type === 'minute')?.value ?? 0)
  const timeDecimal = hours + minutes / 60

  // Get today's date string in ET and next_open's date string in ET
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const todayString = dateFormatter.format(now)
  const nextOpenString = dateFormatter.format(new Date(data.next_open))

  // If next_open is not today, market is closed (weekend or holiday)
  const isTradingDay = todayString === nextOpenString
  if (!isTradingDay) return 'closed'

  // Pre-market: 4:00am–9:30am ET
  if (timeDecimal >= 4 && timeDecimal < 9.5) return 'pre-market'

  // After-hours: 4:00pm–8:00pm ET
  if (timeDecimal >= 16 && timeDecimal < 20) return 'after-hours'

  // Market closed for the day (e.g. early close, halt, or gap between close and after-hours)
  return 'closed'
}
