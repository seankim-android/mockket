// Integration tests — require real Alpaca credentials (ALPACA_API_KEY, ALPACA_BASE_URL)
// Skipped automatically when env vars are not set.
// Run with: ALPACA_API_KEY=... ALPACA_API_SECRET=... ALPACA_BASE_URL=... npx jest alpaca.test

const hasCredentials = !!(
  process.env.ALPACA_API_KEY &&
  process.env.ALPACA_API_SECRET &&
  process.env.ALPACA_BASE_URL
)

const describeIfCredentials = hasCredentials ? describe : describe.skip

describeIfCredentials('getQuote (integration)', () => {
  it('returns bid, ask, and mid for a valid ticker', async () => {
    const { getQuote } = await import('../alpaca')
    const quote = await getQuote('AAPL')
    expect(quote.ticker).toBe('AAPL')
    expect(quote.ask).toBeGreaterThan(0)
    expect(quote.bid).toBeGreaterThan(0)
    expect(quote.mid).toBe((quote.ask + quote.bid) / 2)
  })
})
