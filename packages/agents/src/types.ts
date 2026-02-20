import type { Trade, AgentMeta, ProposedTrade } from '@mockket/shared'

export type { ProposedTrade }

export interface Portfolio {
  cash: number
  holdings: Array<{
    ticker: string
    quantity: number
    avgCost: number
    currentPrice: number
  }>
}

export interface MarketData {
  prices: Record<string, number>
  timestamp: string
}

export interface AgentModule extends AgentMeta {
  rebalance(portfolio: Portfolio, marketData: MarketData): Promise<Trade[]>
  getRationale(trade: Trade): string
  react(userTrade: Trade): string
  preview(proposed: ProposedTrade): string
}
