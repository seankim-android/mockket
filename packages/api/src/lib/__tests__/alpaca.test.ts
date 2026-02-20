// Integration tests — run with real Alpaca keys
// For unit tests, mock the axios calls

import { getQuote } from '../alpaca'

describe('getQuote', () => {
  it('returns bid, ask, and mid for a valid ticker', async () => {
    const quote = await getQuote('AAPL')
    expect(quote.ticker).toBe('AAPL')
    expect(quote.ask).toBeGreaterThan(0)
    expect(quote.bid).toBeGreaterThan(0)
    expect(quote.mid).toBe((quote.ask + quote.bid) / 2)
  })
})
