import type { Trade, ProposedTrade } from '@mockket/shared'
import type { AgentModule, Portfolio, MarketData } from '../types'

export const priyaSharma: AgentModule = {
  id: 'priya-sharma',
  name: 'Priya Sharma',
  shortName: 'Priya',
  strategy: 'Value investor. Buffett-style fundamentals, long holds, low turnover.',
  riskLevel: 'low',
  assetClasses: ['stocks'],
  rebalanceInterval: 'daily',
  watchlist: ['JNJ', 'MSFT', 'AAPL', 'KO', 'PG'],

  async rebalance(portfolio: Portfolio, marketData: MarketData): Promise<Trade[]> {
    const trades: Trade[] = []

    // Priya rarely trades — only trim extreme runners
    for (const holding of portfolio.holdings) {
      const currentPrice = marketData.prices[holding.ticker]
      if (!currentPrice) continue
      const gainPercent = (currentPrice - holding.avgCost) / holding.avgCost

      // Trim if up >25% — take some profit
      if (gainPercent > 0.25) {
        const trimQuantity = Math.floor(holding.quantity * 0.25) // trim 25%
        if (trimQuantity < 1) continue
        trades.push({
          id: crypto.randomUUID(),
          userId: '',
          agentId: 'priya-sharma',
          ticker: holding.ticker,
          action: 'sell',
          quantity: trimQuantity,
          priceAtExecution: marketData.bid[holding.ticker] ?? currentPrice,
          rationale: `$${holding.ticker} up ${(gainPercent * 100).toFixed(1)}%. Trimming 25% to rebalance — strong conviction, but discipline matters.`,
          challengeId: null,
          executedAt: new Date().toISOString(),
        })
      }
    }

    return trades
  },

  getRationale(trade: Trade): string {
    if (trade.action === 'sell') {
      return `$${trade.ticker} ran past fair value — trimming the position and locking in gains at a disciplined price.`
    }
    return `$${trade.ticker}'s P/E came down to a level I find attractive — initiated a position at a margin of safety.`
  },

  react(userTrade: Trade): string {
    return `I wouldn't have done that on $${userTrade.ticker}, but I respect the conviction.`
  },

  preview(proposed: ProposedTrade): string {
    if (proposed.action === 'buy') {
      return `I'd want to check the P/E before committing to $${proposed.ticker}. Patience is free.`
    }
    return `Selling $${proposed.ticker}? Make sure you're not selling discipline, not just a position.`
  },
}
