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

  async rebalance(_portfolio: Portfolio, _marketData: MarketData): Promise<Trade[]> {
    // TODO: implement momentum strategy
    return []
  },

  getRationale(trade: Trade): string {
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
