// All query keys in one place. Never use raw string arrays outside this file.

export const queryKeys = {
  // Portfolio
  portfolio: (userId: string) => ['portfolio', userId] as const,
  holdings: (userId: string) => ['portfolio', userId, 'holdings'] as const,

  // Agents
  agents: () => ['agents'] as const,
  agent: (agentId: string) => ['agents', agentId] as const,
  agentHires: (userId: string) => ['agent-hires', userId] as const,

  // Markets
  price: (ticker: string) => ['price', ticker] as const,
  prices: (tickers: string[]) => ['prices', ...tickers] as const,
  search: (query: string) => ['search', query] as const,

  // Challenges
  challenges: (userId: string) => ['challenges', userId] as const,
  challenge: (challengeId: string) => ['challenges', challengeId] as const,

  // Recommendations
  recommendations: (userId: string) => ['recommendations', userId] as const,
} as const
