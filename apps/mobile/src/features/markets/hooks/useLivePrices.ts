import { useEffect, useRef, useState } from 'react'
import { createPriceSocket, PriceUpdate } from '../../../lib/ws/client'
import { useAuthStore } from '../../auth/store'

export function useLivePrices(tickers: string[]) {
  const [prices, setPrices] = useState<Record<string, PriceUpdate>>({})
  const wsRef = useRef<WebSocket | null>(null)
  const session = useAuthStore((s) => s.session)

  useEffect(() => {
    if (!session?.access_token || tickers.length === 0) return
    wsRef.current = createPriceSocket(session.access_token, tickers, (update) => {
      setPrices(prev => ({ ...prev, [update.ticker]: update }))
    })
    return () => wsRef.current?.close()
  }, [session?.access_token, tickers.join(',')])

  return prices
}
