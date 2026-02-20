import WebSocket from 'ws'
import { redis } from '../lib/redis'

const ALPACA_WS_URL = 'wss://stream.data.alpaca.markets/v2/sip'

let alpacaWs: WebSocket | null = null

export function startAlpacaStream(tickers: string[]) {
  alpacaWs = new WebSocket(ALPACA_WS_URL)

  alpacaWs.on('open', () => {
    alpacaWs!.send(JSON.stringify({
      action: 'auth',
      key: process.env.ALPACA_API_KEY,
      secret: process.env.ALPACA_API_SECRET,
    }))
  })

  alpacaWs.on('message', async (raw) => {
    const messages = JSON.parse(raw.toString())
    for (const msg of messages) {
      if (msg.T === 'authenticated') {
        // Subscribe to quotes
        alpacaWs!.send(JSON.stringify({ action: 'subscribe', quotes: tickers }))
      }
      if (msg.T === 'q') {
        // Quote update: publish to Redis
        const payload = JSON.stringify({
          ticker: msg.S,
          ask: msg.ap,
          bid: msg.bp,
          mid: (msg.ap + msg.bp) / 2,
          timestamp: msg.t,
        })
        await redis.publish('prices', payload)
      }
    }
  })

  alpacaWs.on('close', () => {
    console.log('[alpaca-ws] disconnected, reconnecting in 5s...')
    setTimeout(() => startAlpacaStream(tickers), 5000)
  })

  alpacaWs.on('error', (err) => console.error('[alpaca-ws] error:', err))
}
