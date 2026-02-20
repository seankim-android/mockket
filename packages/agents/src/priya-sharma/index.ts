import type { Trade } from '@mockket/shared'
import type { AgentModule, Portfolio, MarketData } from '../types'

export const priyaSharma: AgentModule = {
  id: 'priya-sharma',
  name: 'Priya Sharma',
  shortName: 'Priya',
  strategy: 'Value investor. Buffett-style fundamentals, long holds, low turnover.',
  riskLevel: 'low',
  assetClasses: ['stocks'],
  rebalanceInterval: 'daily',

  async rebalance(_portfolio: Portfolio, _marketData: MarketData): Promise<Trade[]> {
    // TODO: implement value strategy
    return []
  },

  getRationale(trade: Trade): string {
    return `P/E came down to an attractive entry point after the pullback, initiated a position in $${trade.ticker}.`
  },

  react(userTrade: Trade): string {
    return `I wouldn't have done that on $${userTrade.ticker}, but I respect the conviction.`
  },
}
