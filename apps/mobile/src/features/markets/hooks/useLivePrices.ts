import { useEffect, useRef, useState } from 'react'
import { createPriceSocket, PriceUpdate } from '../../../lib/ws/client'

export function useLivePrices() {
  const [prices, setPrices] = useState<Record<string, PriceUpdate>>({})
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    wsRef.current = createPriceSocket((update) => {
      setPrices(prev => ({ ...prev, [update.ticker]: update }))
    })
    return () => wsRef.current?.close()
  }, [])

  return prices
}
