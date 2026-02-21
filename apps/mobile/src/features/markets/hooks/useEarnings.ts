import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/query/keys'

export function useEarnings(tickers: string[]) {
  return useQuery({
    queryKey: queryKeys.earnings(tickers),
    queryFn: async () => {
      if (tickers.length === 0) return {}
      const data = await api.get<Record<string, string>>(
        `/config/earnings?tickers=${tickers.join(',')}`
      )
      return data
    },
    enabled: tickers.length > 0,
    staleTime: 60 * 60 * 1000, // 1 hour
  })
}
