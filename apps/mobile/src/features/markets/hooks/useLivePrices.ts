import { useEffect, useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { subscribeTickers, PriceUpdate } from '../../../lib/ws/client'
import { queryKeys } from '../../../lib/query/keys'

export function useLivePrices(tickers: string[]) {
  useEffect(() => {
    if (tickers.length > 0) subscribeTickers(tickers)
  }, [tickers.join(',')])

  const queries = useQueries({
    queries: tickers.map((ticker) => ({
      queryKey: queryKeys.price(ticker),
      queryFn: () => Promise.resolve(null as PriceUpdate | null),
      staleTime: Infinity,
    })),
  })

  return useMemo(() => {
    const result: Record<string, PriceUpdate> = {}
    for (let i = 0; i < tickers.length; i++) {
      const data = queries[i]?.data
      if (data) result[tickers[i]] = data
    }
    return result
  }, [tickers.join(','), ...queries.map((q) => q.data)])
}
