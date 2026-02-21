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

  // Get current time in ET
  const nowET = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const hours = nowET.getHours()
  const minutes = nowET.getMinutes()
  const timeDecimal = hours + minutes / 60

  // Check if today is a trading day by seeing if next_open is today
  const nextOpen = new Date(data.next_open)
  const nextOpenET = new Date(nextOpen.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const todayET = new Date(nowET)
  todayET.setHours(0, 0, 0, 0)
  const nextOpenDay = new Date(nextOpenET)
  nextOpenDay.setHours(0, 0, 0, 0)

  const isTradingDay = nextOpenDay.getTime() === todayET.getTime()

  if (!isTradingDay) return 'closed' // weekend or holiday

  // Pre-market: 4:00am–9:30am ET
  if (timeDecimal >= 4 && timeDecimal < 9.5) return 'pre-market'

  // After-hours: 4:00pm–8:00pm ET
  if (timeDecimal >= 16 && timeDecimal < 20) return 'after-hours'

  return 'closed'
}
