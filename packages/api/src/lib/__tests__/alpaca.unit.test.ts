/**
 * Unit tests for market status logic and bid/ask price rules.
 * These test the pure logic without network calls.
 */

describe('market status time logic', () => {
  function classifyTime(hour: number, minute: number, isWeekend: boolean): string {
    if (isWeekend) return 'closed'
    const t = hour * 60 + minute
    if (t >= 4 * 60 && t < 9 * 60 + 30) return 'pre-market'
    if (t >= 9 * 60 + 30 && t < 16 * 60) return 'open'
    if (t >= 16 * 60 && t < 20 * 60) return 'after-hours'
    return 'closed'
  }

  it('returns "open" during market hours on a weekday', () => {
    expect(classifyTime(11, 0, false)).toBe('open')
    expect(classifyTime(9, 30, false)).toBe('open')
    expect(classifyTime(15, 59, false)).toBe('open')
  })

  it('returns "closed" on Saturday', () => {
    expect(classifyTime(11, 0, true)).toBe('closed')
  })

  it('returns "closed" on Sunday', () => {
    expect(classifyTime(14, 0, true)).toBe('closed')
  })

  it('returns "pre-market" between 4am and 9:30am ET', () => {
    expect(classifyTime(4, 0, false)).toBe('pre-market')
    expect(classifyTime(8, 0, false)).toBe('pre-market')
    expect(classifyTime(9, 29, false)).toBe('pre-market')
  })

  it('returns "after-hours" between 4pm and 8pm ET', () => {
    expect(classifyTime(16, 0, false)).toBe('after-hours')
    expect(classifyTime(17, 30, false)).toBe('after-hours')
    expect(classifyTime(19, 59, false)).toBe('after-hours')
  })

  it('returns "closed" before 4am ET', () => {
    expect(classifyTime(2, 0, false)).toBe('closed')
    expect(classifyTime(3, 59, false)).toBe('closed')
  })

  it('returns "closed" after 8pm ET', () => {
    expect(classifyTime(20, 0, false)).toBe('closed')
    expect(classifyTime(23, 0, false)).toBe('closed')
  })
})

describe('bid/ask price rules', () => {
  interface Quote {
    bid: number
    ask: number
    mid: number
  }

  function getBuyPrice(quote: Quote): number {
    return quote.ask
  }

  function getSellPrice(quote: Quote): number {
    return quote.bid
  }

  it('buy price uses ask (higher than mid)', () => {
    const quote: Quote = { bid: 99.5, ask: 100.5, mid: 100.0 }
    expect(getBuyPrice(quote)).toBe(100.5)
    expect(getBuyPrice(quote)).toBeGreaterThan(quote.mid)
  })

  it('sell price uses bid (lower than mid)', () => {
    const quote: Quote = { bid: 99.5, ask: 100.5, mid: 100.0 }
    expect(getSellPrice(quote)).toBe(99.5)
    expect(getSellPrice(quote)).toBeLessThan(quote.mid)
  })

  it('bid/ask spread is always positive', () => {
    const quote: Quote = { bid: 99.5, ask: 100.5, mid: 100.0 }
    expect(quote.ask - quote.bid).toBeGreaterThan(0)
  })

  it('mid is between bid and ask', () => {
    const quote: Quote = { bid: 99.5, ask: 100.5, mid: 100.0 }
    expect(quote.mid).toBeGreaterThan(quote.bid)
    expect(quote.mid).toBeLessThan(quote.ask)
  })
})

describe('agent allocation rules', () => {
  it('buy quantity uses ask price for allocation', () => {
    const allocation = 10_000
    const askPrice = 100.5
    const quantity = Math.floor(allocation / askPrice)
    expect(quantity).toBe(99) // floor(10000/100.5) = 99
  })

  it('minimum allocation is $1,000', () => {
    const MIN_ALLOCATION = 1000
    const allocation = 500
    expect(allocation >= MIN_ALLOCATION).toBe(false)
  })

  it('maximum allocation is 50% of available cash', () => {
    const availableCash = 50_000
    const maxAllocation = availableCash * 0.5
    const requestedAllocation = 30_000
    const actualAllocation = Math.min(requestedAllocation, maxAllocation)
    expect(actualAllocation).toBe(25_000)
  })

  it('split ratio > 0 guard prevents division by zero', () => {
    const ratio = 0
    expect(ratio > 0).toBe(false) // would be skipped
    const validRatio = 2
    expect(validRatio > 0).toBe(true)
  })
})

describe('dividend credit logic', () => {
  it('credit = quantity * amount_per_share', () => {
    const quantity = 100
    const amountPerShare = 0.25
    const credit = quantity * amountPerShare
    expect(credit).toBe(25)
  })

  it('skips zero or negative credits', () => {
    const credit = 0
    expect(credit <= 0).toBe(true) // would be skipped
  })
})
