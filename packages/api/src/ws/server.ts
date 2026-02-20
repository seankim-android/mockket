import { Server as HttpServer } from 'http'
import WebSocket, { WebSocketServer } from 'ws'
import { createClient } from '@supabase/supabase-js'
import { redis } from '../lib/redis'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export function startWsServer(httpServer: HttpServer) {
  const wss = new WebSocketServer({ server: httpServer })
  const subscriber = redis.duplicate()

  subscriber.on('error', (err) => console.error('[ws] redis subscriber error:', err))

  // Subscribe to Redis price channel
  subscriber.subscribe('prices')
  subscriber.on('message', (_channel, message) => {
    // Fan out to all connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
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

    console.log('[ws] client connected:', user.id)
    ws.on('close', () => console.log('[ws] client disconnected:', user.id))
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
