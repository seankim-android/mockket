import { Server as HttpServer } from 'http'
import WebSocket, { WebSocketServer } from 'ws'
import { redis } from '../lib/redis'

export function startWsServer(httpServer: HttpServer) {
  const wss = new WebSocketServer({ server: httpServer })
  const subscriber = redis.duplicate()

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

  wss.on('connection', (ws) => {
    console.log('[ws] client connected')
    ws.on('close', () => console.log('[ws] client disconnected'))
  })

  console.log('[ws] server started')
}
