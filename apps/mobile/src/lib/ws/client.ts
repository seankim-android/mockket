import { queryClient } from '../query/client'
import { queryKeys } from '../query/keys'
import { useAuthStore } from '../../features/auth/store'

const WS_URL = process.env.EXPO_PUBLIC_WS_URL ?? 'ws://localhost:3000'

export interface PriceUpdate {
  ticker: string
  ask: number
  bid: number
  mid: number
  timestamp: string
}

let socket: WebSocket | null = null
let _tickers: string[] = []
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

export function connectPriceFeed(token: string, tickers: string[] = []) {
  if (socket) return
  _tickers = tickers

  socket = new WebSocket(WS_URL)

  socket.onopen = () => {
    // Message-based auth — no token in URL
    socket!.send(JSON.stringify({ action: 'auth', token }))
    if (_tickers.length > 0) {
      socket!.send(JSON.stringify({ action: 'subscribe', tickers: _tickers }))
    }
  }

  socket.onmessage = (event) => {
    let msg: PriceUpdate
    try {
      msg = JSON.parse(event.data as string)
    } catch {
      return // ignore malformed frames
    }
    if (msg.ticker && typeof msg.mid === 'number') {
      // Store the full PriceUpdate so all consumers get bid/ask/mid
      queryClient.setQueryData(queryKeys.price(msg.ticker), msg)
    }
  }

  socket.onerror = (e) => {
    if (__DEV__) console.error('[ws] error', e)
  }

  socket.onclose = (event) => {
    socket = null

    // 4001 = auth rejected — don't reconnect with a bad token
    if (event.code === 4001) {
      if (__DEV__) console.error('[ws] auth rejected (4001), not reconnecting')
      return
    }

    // Fetch fresh token on reconnect
    const freshToken = useAuthStore.getState().session?.access_token
    if (freshToken) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null
        connectPriceFeed(freshToken, _tickers)
      }, 3_000)
    }
  }
}

export function subscribeTickers(tickers: string[]) {
  if (!tickers.length) return
  const newTickers = tickers.filter((t) => !_tickers.includes(t))
  if (!newTickers.length) return
  _tickers = [..._tickers, ...newTickers]
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ action: 'subscribe', tickers: newTickers }))
  }
}

export function disconnectPriceFeed() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  socket?.close()
  socket = null
}
