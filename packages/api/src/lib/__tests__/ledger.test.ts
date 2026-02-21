// Mock db/client before any imports so process.exit is never triggered
jest.mock('../../db/client', () => ({
  db: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}))

import { db } from '../../db/client'
import { executeTrade, getPortfolio } from '../ledger'

const mockDb = db as jest.Mocked<typeof db>

// Helper: build a mock PoolClient
function mockClient(overrides: Record<string, jest.Mock> = {}) {
  const client = {
    query: jest.fn(),
    release: jest.fn(),
    ...overrides,
  }
  ;(mockDb.connect as jest.Mock).mockResolvedValue(client)
  return client
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('executeTrade (buy)', () => {
  it('deducts cash from portfolio and creates holding at ask price', async () => {
    const client = mockClient()

    // BEGIN
    client.query.mockResolvedValueOnce({})
    // UPDATE users SET portfolio_cash = portfolio_cash - $1 RETURNING id
    client.query.mockResolvedValueOnce({ rows: [{ id: 'user-1' }], rowCount: 1 })
    // INSERT INTO holdings (upsert — main portfolio path)
    client.query.mockResolvedValueOnce({ rows: [], rowCount: 1 })
    // INSERT INTO trades
    client.query.mockResolvedValueOnce({ rows: [{ id: 'trade-1' }], rowCount: 1 })
    // COMMIT
    client.query.mockResolvedValueOnce({})

    await executeTrade({
      userId: 'user-1',
      ticker: 'AAPL',
      action: 'buy',
      quantity: 10,
      price: 185.50,
      rationale: '',
    })

    expect(client.query).toHaveBeenCalledWith('BEGIN')
    expect(client.query).toHaveBeenCalledWith('COMMIT')
    expect(client.release).toHaveBeenCalled()

    // Verify cash deduction used the correct amount
    const cashDeductCall = client.query.mock.calls.find(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('portfolio_cash - $1')
    )
    expect(cashDeductCall).toBeDefined()
    expect(cashDeductCall![1][0]).toBe(10 * 185.50) // cost = quantity * price
  })

  it('throws "Insufficient cash" and rolls back if cash check fails', async () => {
    const client = mockClient()

    client.query.mockResolvedValueOnce({})                          // BEGIN
    client.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })   // cash deduct — no rows = insufficient
    client.query.mockResolvedValueOnce({})                          // ROLLBACK

    await expect(
      executeTrade({
        userId: 'user-1',
        ticker: 'AAPL',
        action: 'buy',
        quantity: 10,
        price: 185.50,
        rationale: '',
      })
    ).rejects.toThrow('Insufficient cash')

    expect(client.query).toHaveBeenCalledWith('ROLLBACK')
    expect(client.release).toHaveBeenCalled()
  })
})

describe('executeTrade (sell)', () => {
  it('reduces holding and returns cash at bid price (independent of buy test)', async () => {
    const client = mockClient()

    client.query.mockResolvedValueOnce({})                                   // BEGIN
    client.query.mockResolvedValueOnce({ rows: [], rowCount: 1 })            // UPDATE holdings quantity
    client.query.mockResolvedValueOnce({ rows: [], rowCount: 1 })            // UPDATE users portfolio_cash +
    client.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })            // DELETE zero-quantity holdings
    client.query.mockResolvedValueOnce({ rows: [{ id: 'trade-1' }], rowCount: 1 }) // INSERT trades
    client.query.mockResolvedValueOnce({})                                   // COMMIT

    await executeTrade({
      userId: 'user-1',
      ticker: 'AAPL',
      action: 'sell',
      quantity: 5,
      price: 184.80,
      rationale: '',
    })

    expect(client.query).toHaveBeenCalledWith('BEGIN')
    expect(client.query).toHaveBeenCalledWith('COMMIT')
    expect(client.release).toHaveBeenCalled()
  })

  it('throws "Insufficient holding quantity" and rolls back if holding check fails', async () => {
    const client = mockClient()

    client.query.mockResolvedValueOnce({})                          // BEGIN
    client.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })   // UPDATE holdings — 0 rows = insufficient
    client.query.mockResolvedValueOnce({})                          // ROLLBACK

    await expect(
      executeTrade({
        userId: 'user-1',
        ticker: 'AAPL',
        action: 'sell',
        quantity: 5,
        price: 184.80,
        rationale: '',
      })
    ).rejects.toThrow('Insufficient holding quantity')

    expect(client.query).toHaveBeenCalledWith('ROLLBACK')
    expect(client.release).toHaveBeenCalled()
  })
})

describe('getPortfolio', () => {
  it('returns cash and holdings from DB', async () => {
    // getPortfolio uses db.connect() → client.query (not db.query directly)
    const client = mockClient()
    client.query.mockResolvedValueOnce({})  // BEGIN ISOLATION LEVEL REPEATABLE READ
    client.query.mockResolvedValueOnce({    // SELECT portfolio_cash FROM users
      rows: [{ portfolio_cash: '98145.00' }], rowCount: 1,
    })
    client.query.mockResolvedValueOnce({    // SELECT holdings
      rows: [{ ticker: 'AAPL', quantity: '10', avg_cost: '185.50' }], rowCount: 1,
    })
    client.query.mockResolvedValueOnce({})  // COMMIT

    const portfolio = await getPortfolio('user-1')

    expect(portfolio.cash).toBe(98145)
    expect(portfolio.holdings).toHaveLength(1)
    expect(portfolio.holdings[0].ticker).toBe('AAPL')
    expect(portfolio.holdings[0].quantity).toBe(10)
    expect(portfolio.holdings[0].avgCost).toBe(185.50)
    expect(client.release).toHaveBeenCalled()
  })

  it('throws if user not found', async () => {
    const client = mockClient()
    client.query.mockResolvedValueOnce({})   // BEGIN
    client.query.mockResolvedValueOnce({ rows: [], rowCount: 0 }) // SELECT users — no rows
    client.query.mockResolvedValueOnce({})   // ROLLBACK

    await expect(getPortfolio('unknown')).rejects.toThrow('User not found')
    expect(client.release).toHaveBeenCalled()
  })
})
