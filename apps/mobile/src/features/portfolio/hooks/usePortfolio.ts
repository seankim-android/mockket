import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/query/keys'

export function usePortfolio(userId: string) {
  return useQuery({
    queryKey: queryKeys.portfolio(userId),
    queryFn: () => api.get<{ cash: number; totalValue: number }>(`/portfolio/${userId}`),
    enabled: Boolean(userId),
  })
}
