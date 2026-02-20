import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/query/keys'
import type { AgentMeta } from '@mockket/shared'

export function useAgents() {
  return useQuery({
    queryKey: queryKeys.agents(),
    queryFn: () => api.get<AgentMeta[]>('/agents'),
    staleTime: 5 * 60_000,
  })
}
