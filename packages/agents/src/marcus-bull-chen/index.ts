import type { Trade, ProposedTrade } from '@mockket/shared'
import type { AgentModule, Portfolio, MarketData } from '../types'

export const marcusBullChen: AgentModule = {
  id: 'marcus-bull-chen',
  name: 'Marcus "The Bull" Chen',
  shortName: 'Marcus',
  strategy: 'Momentum trader chasing high-volume breakouts in stocks and crypto.',
  riskLevel: 'high',
  assetClasses: ['stocks', 'crypto'],
  rebalanceInterval: 'daily',
  watchlist: ['NVDA', 'TSLA', 'AMD', 'META', 'AMZN'],

  async rebalance(portfolio: Portfolio, marketData: MarketData): Promise<Trade[]> {
    const trades: Trade[] = []
    const totalValue = portfolio.cash +
      portfolio.holdings.reduce((sum, h) => sum + h.quantity * (marketData.prices[h.ticker] ?? 0), 0)

    // Cut losers: sell anything down >5% from avg cost
    for (const holding of portfolio.holdings) {
      const currentPrice = marketData.prices[holding.ticker]
      if (!currentPrice) continue
      const lossPercent = (currentPrice - holding.avgCost) / holding.avgCost
      if (lossPercent < -0.05) {
        trades.push({
          id: crypto.randomUUID(),
          userId: '', // filled by cron runner
          agentId: 'marcus-bull-chen',
          ticker: holding.ticker,
          action: 'sell',
          quantity: holding.quantity,
          priceAtExecution: marketData.bid[holding.ticker] ?? currentPrice,
          rationale: `$${holding.ticker} down ${(lossPercent * 100).toFixed(1)}% from cost basis — cutting the loser, rotating capital.`,
          challengeId: null,
          executedAt: new Date().toISOString(),
        })
      }
    }

    // Buy breakout: allocate up to 10% of portfolio to a single new position
    // For now: buy the first unowned ticker from watchlist with sufficient allocation
    const watchlist = ['NVDA', 'TSLA', 'AMD', 'META', 'AMZN']
    for (const ticker of watchlist) {
      const price = marketData.prices[ticker]
      if (!price) continue
      const alreadyHeld = portfolio.holdings.some(h => h.ticker === ticker)
      if (alreadyHeld) continue
      const askPrice = marketData.ask[ticker] ?? price
      const allocation = Math.min(totalValue * 0.10, portfolio.cash)
      if (allocation < 1000) continue
      const quantity = Math.floor(allocation / askPrice)
      if (quantity < 1) continue

      trades.push({
        id: crypto.randomUUID(),
        userId: '',
        agentId: 'marcus-bull-chen',
        ticker,
        action: 'buy',
        quantity,
        priceAtExecution: askPrice,
        rationale: `Volume spike on $${ticker}, classic breakout setup, went in heavy.`,
        challengeId: null,
        executedAt: new Date().toISOString(),
      })
      break // one new position per rebalance
    }

    return trades
  },

  getRationale(trade: Trade): string {
    if (trade.action === 'sell') {
      return `$${trade.ticker} hit my stop-loss threshold — cutting the loss before it compounds. Discipline over ego.`
    }
    return `Volume spike on $${trade.ticker}, classic breakout setup, went in heavy.`
  },

  react(userTrade: Trade): string {
    return `Bold move on $${userTrade.ticker}. Let's see if you can keep up.`
  },

  preview(proposed: ProposedTrade): string {
    const pct = ((proposed.estimatedValue / proposed.portfolioValue) * 100).toFixed(1)
    if (proposed.action === 'buy') {
      return Number(pct) < 5
        ? `Small position on a breakout name — I'd go bigger, but I get it.`
        : `Now we're talking. ${pct}% allocation on $${proposed.ticker}. Let's ride.`
    }
    return `Trimming $${proposed.ticker}? I'd hold, but your call.`
  },
}
