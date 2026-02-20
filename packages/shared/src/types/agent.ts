export type RiskLevel = 'low' | 'medium' | 'high' | 'degen'
export type AssetClass = 'stocks' | 'crypto'
export type RebalanceInterval = 'daily' | '6h' | 'never'
export type AgentMode = 'advisory' | 'autopilot'

export interface AgentMeta {
  id: string
  name: string
  shortName: string
  strategy: string
  riskLevel: RiskLevel
  assetClasses: AssetClass[]
  rebalanceInterval: RebalanceInterval
}

export interface AgentHire {
  id: string
  userId: string
  agentId: string
  allocatedCash: number
  mode: AgentMode
  isActive: boolean
  isPaused: boolean
  hiredAt: string
  pausedAt: string | null
}

export interface ProposedTrade {
  ticker: string
  action: 'buy' | 'sell'
  quantity: number
  estimatedValue: number   // quantity * current price
  portfolioValue: number   // user's total portfolio value
}
