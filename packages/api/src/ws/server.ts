import { Server as HttpServer } from 'http'
import WebSocket, { WebSocketServer } from 'ws'
import { createClient } from '@supabase/supabase-js'
import { redis } from '../lib/redis'
import { addTicker } from './alpaca-stream'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

// Per-client subscription sets
const clientSubscriptions = new Map<WebSocket, Set<string>>()

export function startWsServer(httpServer: HttpServer) {
  const wss = new WebSocketServer({ server: httpServer })
  const subscriber = redis.duplicate()

  subscriber.on('error', (err) => console.error('[ws] redis subscriber error:', err))

  subscriber.subscribe('prices')
  subscriber.on('message', (_channel, message) => {
    let payload: { ticker: string } | null = null
    try { payload = JSON.parse(message) } catch { return }
    if (!payload?.ticker) return

    // Only send to clients subscribed to this ticker
    wss.clients.forEach((client) => {
      if (client.readyState !== WebSocket.OPEN) return
      const subs = clientSubscriptions.get(client)
      if (subs?.has(payload!.ticker)) {
        client.send(message)
      }
    })
  })

  wss.on('connection', async (ws, req) => {
    const url = new URL(req.url ?? '', 'http://localhost')
    const token = url.searchParams.get('token')

    if (!token) {
      ws.close(4001, 'Unauthorized')
      return
    }

    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      ws.close(4001, 'Unauthorized')
      return
    }

    clientSubscriptions.set(ws, new Set())
    console.log('[ws] client connected:', user.id)

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString())
        if (msg.action === 'subscribe' && Array.isArray(msg.tickers)) {
          const subs = clientSubscriptions.get(ws)!
          for (const ticker of msg.tickers) {
            if (typeof ticker === 'string') {
              subs.add(ticker.toUpperCase())
              addTicker(ticker.toUpperCase())
            }
          }
        }
        if (msg.action === 'unsubscribe' && Array.isArray(msg.tickers)) {
          const subs = clientSubscriptions.get(ws)!
          for (const ticker of msg.tickers) {
            subs.delete(ticker.toUpperCase())
          }
        }
      } catch {
        // ignore malformed frames
      }
    })

    ws.on('close', () => {
      clientSubscriptions.delete(ws)
      console.log('[ws] client disconnected:', user.id)
    })
  })

  console.log('[ws] server started')

  return {
    wss,
    close: async () => {
      await subscriber.unsubscribe('prices')
      subscriber.disconnect()
      wss.close()
    },
  }
}
