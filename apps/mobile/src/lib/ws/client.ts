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

export function createPriceSocket(
  token: string,
  tickers: string[],
  onMessage: (data: PriceUpdate) => void,
): WebSocket {
  const ws = new WebSocket(`${WS_URL}?token=${token}`)
  ws.onopen = () => {
    ws.send(JSON.stringify({ action: 'subscribe', tickers }))
  }
  ws.onmessage = (e) => onMessage(JSON.parse(e.data as string) as PriceUpdate)
  ws.onerror = (e) => console.error('[ws] error', e)
  return ws
}

let socket: WebSocket | null = null
let _token: string | null = null
let _tickers: string[] = []

export function connectPriceFeed(token: string, tickers: string[] = []) {
  if (socket) return
  _token = token
  _tickers = tickers

  socket = new WebSocket(`${WS_URL}?token=${token}`)

  socket.onopen = () => {
    if (_tickers.length > 0) {
      socket!.send(JSON.stringify({ action: 'subscribe', tickers: _tickers }))
    }
  }

  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data as string) as PriceUpdate
    if (msg.ticker && typeof msg.mid === 'number') {
      // Bridge WebSocket prices directly into TanStack Query cache
      queryClient.setQueryData(queryKeys.price(msg.ticker), msg.mid)
    }
  }

  socket.onerror = (e) => console.error('[ws] error', e)

  socket.onclose = () => {
    socket = null
    // Reconnect after 3 seconds
    if (_token) setTimeout(() => connectPriceFeed(_token!, _tickers), 3_000)
  }
}

export function subscribeTickers(tickers: string[]) {
  if (!tickers.length) return
  _tickers = [...new Set([..._tickers, ...tickers])]
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ action: 'subscribe', tickers }))
  }
}

export function disconnectPriceFeed() {
  _token = null
  socket?.close()
  socket = null
}
