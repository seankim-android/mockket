import { queryClient } from '../query/client'
import { queryKeys } from '../query/keys'

const WS_URL = process.env.EXPO_PUBLIC_WS_URL ?? 'ws://localhost:3000'

export interface PriceUpdate {
  ticker: string
  ask: number
  bid: number
  mid: number
  timestamp: string
}

export function createPriceSocket(onMessage: (data: PriceUpdate) => void): WebSocket {
  const ws = new WebSocket(WS_URL)
  ws.onmessage = (e) => onMessage(JSON.parse(e.data as string) as PriceUpdate)
  ws.onerror = (e) => console.error('[ws] error', e)
  return ws
}

type PriceMessage = { type: 'price'; ticker: string; price: number }
type WsMessage = PriceMessage

let socket: WebSocket | null = null

export function connectPriceFeed(url: string) {
  if (socket) return

  socket = new WebSocket(url)

  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data as string) as WsMessage

    if (msg.type === 'price') {
      // Bridge WebSocket prices directly into TanStack Query cache
      queryClient.setQueryData(queryKeys.price(msg.ticker), msg.price)
    }
  }

  socket.onclose = () => {
    socket = null
    // Reconnect after 3 seconds
    setTimeout(() => connectPriceFeed(url), 3_000)
  }
}

export function disconnectPriceFeed() {
  socket?.close()
  socket = null
}
