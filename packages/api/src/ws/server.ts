import { Server as HttpServer } from 'http'
import WebSocket, { WebSocketServer } from 'ws'
import { createClient } from '@supabase/supabase-js'
import { redis } from '../lib/redis'
import { addTicker, removeTicker } from './alpaca-stream'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

// Per-client subscription sets
const clientSubscriptions = new Map<WebSocket, Set<string>>()

// Clients that have completed message-based auth
const authenticatedClients = new WeakSet<WebSocket>()

// Heartbeat tracking: clients that responded to the last ping
const aliveClients = new WeakSet<WebSocket>()

// Buffered messages received before auth completes
const pendingMessages = new Map<WebSocket, string[]>()

// Global ref count per ticker across all clients
const tickerRefCount = new Map<string, number>()

function refTicker(ticker: string) {
  const count = tickerRefCount.get(ticker) ?? 0
  tickerRefCount.set(ticker, count + 1)
  if (count === 0) addTicker(ticker)
}

function unrefTicker(ticker: string) {
  const count = tickerRefCount.get(ticker) ?? 0
  if (count <= 1) {
    tickerRefCount.delete(ticker)
    removeTicker(ticker)
  } else {
    tickerRefCount.set(ticker, count - 1)
  }
}

export function startWsServer(httpServer: HttpServer) {
  const wss = new WebSocketServer({ server: httpServer })
  const subscriber = redis.duplicate()

  subscriber.on('error', (err) => console.error('[ws] redis subscriber error:', err))

  subscriber.subscribe('prices').catch((err) =>
    console.error('[ws] redis subscribe failed:', err)
  )
  subscriber.on('message', (_channel, message) => {
    let payload: { ticker: string } | null = null
    try { payload = JSON.parse(message) } catch { return }
    if (!payload?.ticker) return

    // Only send to authenticated clients subscribed to this ticker
    wss.clients.forEach((client) => {
      if (client.readyState !== WebSocket.OPEN) return
      if (!authenticatedClients.has(client)) return
      const subs = clientSubscriptions.get(client)
      if (subs?.has(payload!.ticker)) {
        client.send(message)
      }
    })
  })

  // Heartbeat: ping every 30s, terminate clients that didn't pong
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!aliveClients.has(ws)) {
        ws.terminate()
        return
      }
      aliveClients.delete(ws)
      ws.ping()
    })
  }, 30_000)

  wss.on('close', () => clearInterval(heartbeatInterval))

  wss.on('connection', (ws) => {
    // Mark alive on connect (gets first heartbeat window)
    aliveClients.add(ws)
    pendingMessages.set(ws, [])

    ws.on('pong', () => aliveClients.add(ws))

    // Auth timeout: if no auth message within 5s, close
    const authTimeout = setTimeout(() => {
      if (!authenticatedClients.has(ws)) {
        ws.close(4001, 'Auth timeout')
      }
    }, 5_000)

    let authStarted = false

    ws.on('message', async (raw) => {
      let msg: any
      try {
        msg = JSON.parse(raw.toString())
      } catch {
        return // ignore malformed frames
      }

      // Handle pre-auth state
      if (!authenticatedClients.has(ws)) {
        // First message must be auth; buffer anything else that arrives while auth is in-flight
        if (msg.action === 'auth' && typeof msg.token === 'string' && !authStarted) {
          authStarted = true

          const { data: { user }, error } = await supabase.auth.getUser(msg.token)
          if (error || !user) {
            ws.close(4001, 'Unauthorized')
            return
          }

          clearTimeout(authTimeout)
          authenticatedClients.add(ws)
          clientSubscriptions.set(ws, new Set())
          console.log('[ws] client authenticated:', user.id)

          // Process any messages that arrived during async auth
          const buffered = pendingMessages.get(ws) ?? []
          pendingMessages.delete(ws)
          for (const bufferedRaw of buffered) {
            try {
              const bufferedMsg = JSON.parse(bufferedRaw)
              handleClientMessage(ws, bufferedMsg)
            } catch {
              // ignore
            }
          }
          return
        }

        if (authStarted) {
          // Auth is in-flight — buffer subscribe/unsubscribe messages
          pendingMessages.get(ws)?.push(raw.toString())
        } else {
          // First message wasn't auth
          ws.close(4001, 'First message must be auth')
        }
        return
      }

      handleClientMessage(ws, msg)
    })

    ws.on('close', () => {
      clearTimeout(authTimeout)
      // Unref all tickers this client was subscribed to
      const subs = clientSubscriptions.get(ws)
      if (subs) {
        for (const ticker of subs) {
          unrefTicker(ticker)
        }
      }
      clientSubscriptions.delete(ws)
      pendingMessages.delete(ws)
    })
  })

  function handleClientMessage(ws: WebSocket, msg: any) {
    if (msg.action === 'subscribe' && Array.isArray(msg.tickers)) {
      const subs = clientSubscriptions.get(ws)!
      for (const ticker of msg.tickers) {
        if (typeof ticker === 'string') {
          const t = ticker.toUpperCase()
          if (!subs.has(t)) {
            subs.add(t)
            refTicker(t)
          }
        }
      }
    }
    if (msg.action === 'unsubscribe' && Array.isArray(msg.tickers)) {
      const subs = clientSubscriptions.get(ws)!
      for (const ticker of msg.tickers) {
        const t = ticker.toUpperCase()
        if (subs.has(t)) {
          subs.delete(t)
          unrefTicker(t)
        }
      }
    }
  }

  console.log('[ws] server started')

  return {
    wss,
    close: async () => {
      clearInterval(heartbeatInterval)
      await subscriber.unsubscribe('prices')
      subscriber.disconnect()
      wss.close()
    },
  }
}
