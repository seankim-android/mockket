export type ChallengeDuration = '1w' | '1m' | '3m'
export type ChallengeStatus = 'active' | 'completed' | 'forfeited'

export interface Challenge {
  id: string
  userId: string
  agentId: string | null
  opponentUserId: string | null
  duration: ChallengeDuration
  startingBalance: number
  status: ChallengeStatus
  isForfeited: boolean
  startedAt: string
  endsAt: string
  completedAt: string | null
  winnerId: string | null
}
