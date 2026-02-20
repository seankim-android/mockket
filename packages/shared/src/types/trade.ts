export type TradeAction = 'buy' | 'sell'

export interface Trade {
  id: string
  userId: string
  agentId: string | null
  ticker: string
  action: TradeAction
  quantity: number
  priceAtExecution: number
  rationale: string
  challengeId: string | null
  executedAt: string
}
