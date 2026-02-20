export type RecommendationStatus = 'pending' | 'approved' | 'rejected' | 'expired'

export interface AgentRecommendation {
  id: string
  userId: string
  agentId: string
  challengeId: string | null
  ticker: string
  action: 'buy' | 'sell'
  quantity: number
  rationale: string
  status: RecommendationStatus
  createdAt: string
  expiresAt: string
  actedAt: string | null
}
