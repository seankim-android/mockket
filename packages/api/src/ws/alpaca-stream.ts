import WebSocket from 'ws'
import { redis } from '../lib/redis'

const ALPACA_WS_URL = 'wss://stream.data.alpaca.markets/v2/iex'

let alpacaWs: WebSocket | null = null
let activeTickers: string[] = []
let reconnectDelay = 5000
const MAX_RECONNECT_DELAY = 60000

export function startAlpacaStream(tickers: string[]) {
  activeTickers = tickers
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

function connect() {
  alpacaWs = new WebSocket(ALPACA_WS_URL)

  alpacaWs.on('open', () => {
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
      }
    }
  })

  alpacaWs.on('close', () => {
    console.log(`[alpaca-ws] disconnected, reconnecting in ${reconnectDelay}ms...`)
    setTimeout(connect, reconnectDelay)
    reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY)
  })

  alpacaWs.on('error', (err) => console.error('[alpaca-ws] error:', err))
}
