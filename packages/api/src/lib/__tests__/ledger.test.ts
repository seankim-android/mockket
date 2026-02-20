import { executeTrade, getPortfolio } from '../ledger'

// These tests use a test database — set TEST_DATABASE_URL env var
describe('ledger', () => {
  describe('executeTrade (buy)', () => {
    it('deducts cash and creates holding at ask price', async () => {
      const userId = 'test-user-1'
      const trade = {
        userId,
        ticker: 'AAPL',
        action: 'buy' as const,
        quantity: 10,
        price: 185.50, // ask price
        rationale: '',
      }

      await executeTrade(trade)
      const portfolio = await getPortfolio(userId)

      expect(portfolio.cash).toBe(100000 - 10 * 185.50)
      const holding = portfolio.holdings.find(h => h.ticker === 'AAPL')
      expect(holding?.quantity).toBe(10)
      expect(holding?.avgCost).toBe(185.50)
    })
  })

  describe('executeTrade (sell)', () => {
    it('returns cash at bid price and reduces holding', async () => {
      // Assumes buy test above ran first
      const userId = 'test-user-1'
      const trade = {
        userId,
        ticker: 'AAPL',
        action: 'sell' as const,
        quantity: 5,
        price: 184.80, // bid price
        rationale: '',
      }

      await executeTrade(trade)
      const portfolio = await getPortfolio(userId)

      const holding = portfolio.holdings.find(h => h.ticker === 'AAPL')
      expect(holding?.quantity).toBe(5)
    })
  })
})
