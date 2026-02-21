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
  prices: Record<string, number>  // mid price — for P&L decisions and thresholds
  ask: Record<string, number>     // use for buy quantity allocation
  bid: Record<string, number>     // use for sell P&L calculations
  timestamp: string
}

export interface AgentModule extends AgentMeta {
  watchlist: string[]
  rebalance(portfolio: Portfolio, marketData: MarketData): Promise<Trade[]>
  getRationale(trade: Trade): string
  react(userTrade: Trade): string
  preview(proposed: ProposedTrade): string
}
