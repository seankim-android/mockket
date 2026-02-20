import type { Trade } from '@mockket/shared'
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
}
