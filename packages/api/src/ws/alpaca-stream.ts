import WebSocket from 'ws'
import { redis } from '../lib/redis'

const ALPACA_WS_URL_IEX = 'wss://stream.data.alpaca.markets/v2/iex'
const ALPACA_WS_URL_TEST = 'wss://stream.data.alpaca.markets/v2/test'

let useTestStream = process.env.USE_ALPACA_TEST_STREAM === 'true'

let alpacaWs: WebSocket | null = null
let activeTickers: string[] = []
let reconnectDelay = 5000
const MAX_RECONNECT_DELAY = 60000
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let isConnecting = false

export function getStreamMode(): 'test' | 'iex' {
  return useTestStream ? 'test' : 'iex'
}

export function setTestStream(enabled: boolean) {
  if (useTestStream === enabled) return
  useTestStream = enabled
  console.log(`[alpaca-ws] switching to ${enabled ? 'TEST' : 'IEX'} stream`)
  // Restart with current tickers (test stream only provides AAPL)
  startAlpacaStream(activeTickers)
}

// Per-ticker throttle: skip publishes within 200ms of the last for the same ticker
const lastPublish = new Map<string, number>()

export function stopAlpacaStream() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (alpacaWs) {
    alpacaWs.removeAllListeners()
    alpacaWs.terminate()
    alpacaWs = null
  }
  isConnecting = false
}

export function startAlpacaStream(tickers: string[]) {
  activeTickers = tickers
  // Tear down any existing socket before starting fresh
  if (alpacaWs && alpacaWs.readyState !== WebSocket.CLOSED) {
    alpacaWs.removeAllListeners()
    alpacaWs.terminate()
    alpacaWs = null
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  isConnecting = false
  connect()
}

// Dynamically add a ticker to the live Alpaca subscription
export function addTicker(ticker: string) {
  if (activeTickers.includes(ticker)) return
  activeTickers.push(ticker)
  if (alpacaWs?.readyState === WebSocket.OPEN) {
    alpacaWs.send(JSON.stringify({ action: 'subscribe', quotes: [ticker] }))
  }
}

// Remove a ticker when no clients subscribe to it
export function removeTicker(ticker: string) {
  const idx = activeTickers.indexOf(ticker)
  if (idx === -1) return
  activeTickers.splice(idx, 1)
  lastPublish.delete(ticker)
  if (alpacaWs?.readyState === WebSocket.OPEN) {
    alpacaWs.send(JSON.stringify({ action: 'unsubscribe', quotes: [ticker] }))
  }
}

function connect() {
  if (isConnecting) return
  console.log('[alpaca-ws] connecting...')
  isConnecting = true
  reconnectTimer = null

  const wsUrl = useTestStream ? ALPACA_WS_URL_TEST : ALPACA_WS_URL_IEX
  alpacaWs = new WebSocket(wsUrl)

  alpacaWs.on('open', () => {
    isConnecting = false
    reconnectDelay = 5000 // reset on successful connect
    alpacaWs!.send(JSON.stringify({
      action: 'auth',
      key: process.env.ALPACA_API_KEY,
      secret: process.env.ALPACA_API_SECRET,
    }))
  })

  alpacaWs.on('message', async (raw) => {
    let messages: any[]
    try {
      messages = JSON.parse(raw.toString())
    } catch (err) {
      console.error('[alpaca-ws] parse error:', err)
      return
    }

    for (const msg of messages) {
      if (msg.T === 'authenticated') {
        console.log('[alpaca-ws] authenticated, subscribing to quotes')
        alpacaWs!.send(JSON.stringify({ action: 'subscribe', quotes: activeTickers }))
      }
      if (msg.T === 'q') {
        const now = Date.now()
        const last = lastPublish.get(msg.S) ?? 0
        if (now - last < 200) continue
        lastPublish.set(msg.S, now)

        const payload = JSON.stringify({
          ticker: msg.S,
          ask: msg.ap,
          bid: msg.bp,
          mid: (msg.ap + msg.bp) / 2,
          timestamp: msg.t,
        })
        try {
          await redis.publish('prices', payload)
        } catch (err) {
          console.error('[alpaca-ws] redis publish failed:', err)
        }
      }
      if (msg.T === 'error') {
        console.error('[alpaca-ws] stream error from Alpaca:', msg)
        if (msg.code === 406) {
          // Connection limit: another instance is still alive (e.g. rolling deploy).
          // Close immediately and back off — the close handler will schedule the retry.
          reconnectDelay = 30000
          alpacaWs?.terminate()
        }
      }
    }
  })

  alpacaWs.on('close', () => {
    isConnecting = false
    console.log(`[alpaca-ws] disconnected, reconnecting in ${reconnectDelay}ms...`)
    reconnectTimer = setTimeout(connect, reconnectDelay)
    reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY)
  })

  alpacaWs.on('error', (err) => console.error('[alpaca-ws] error:', err))
}
