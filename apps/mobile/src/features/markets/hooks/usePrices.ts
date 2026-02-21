import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { subscribeTickers } from '@/lib/ws/client'

// Prices are populated by the WebSocket client (lib/ws/client.ts)
// This hook subscribes to the cache — no manual fetch needed for live prices.
export function usePrice(ticker: string) {
  useEffect(() => {
    subscribeTickers([ticker])
  }, [ticker])

  return useQuery<number>({
    queryKey: queryKeys.price(ticker),
    queryFn: () => Promise.resolve(0), // initial value; WS overwrites
    staleTime: Infinity,
  })
}
