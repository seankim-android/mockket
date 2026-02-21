import http from 'http'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { errorHandler } from './middleware/error'
import { portfolioRouter } from './routes/portfolio'
import { tradesRouter } from './routes/trades'
import { recommendationsRouter } from './routes/recommendations'
import { challengesRouter } from './routes/challenges'
import { webhooksRouter } from './routes/webhooks'
import { configRouter } from './routes/config'
import { usersRouter } from './routes/users'
import { agentHiresRouter } from './routes/agent-hires'
import { activityRouter } from './routes/activity'
import { marketsRouter } from './routes/markets'
import { startMarketDataCron } from './cron/sync-market-data'
import { startAgentCrons } from './cron/agent-rebalance'
import { startRecommendationCron } from './cron/generate-recommendations'
import { startMorningBriefCron, startScheduledJobsCron } from './cron/morning-briefs'
import { startExpireChallengesCron } from './cron/expire-challenges'
import { startDividendCron } from './cron/dividend-credits'
import { startSplitCron } from './cron/split-adjustments'
import { startAlpacaStream, stopAlpacaStream } from './ws/alpaca-stream'
import { startWsServer } from './ws/server'

dotenv.config()

const app = express()
const PORT = process.env.PORT ?? 3000

app.use(helmet())
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*' }))
app.use(express.json())

// Health check
app.get('/health', (_req, res) => res.json({ ok: true }))

// Universal Links — iOS Apple App Site Association
app.get('/.well-known/apple-app-site-association', (_req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.json({
    applinks: {
      apps: [],
      details: [{
        appID: 'P9JCC93UUW.app.mockket',
        paths: ['/auth/callback'],
      }],
    },
  })
})

// Universal Links — Android Digital Asset Links
app.get('/.well-known/assetlinks.json', (_req, res) => {
  res.json([{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: 'app.mockket',
      sha256_cert_fingerprints: ['08:5C:A6:79:4C:63:C1:B9:99:21:B4:BE:E9:28:4A:47:7D:30:2D:73:20:B5:9E:2A:7D:68:B3:93:AB:F2:CC:ED'],
    },
  }])
})

// Routes
app.use('/portfolio', portfolioRouter)
app.use('/trades', tradesRouter)
app.use('/recommendations', recommendationsRouter)
app.use('/challenges', challengesRouter)
app.use('/webhooks', webhooksRouter)
app.use('/config', configRouter)
app.use('/users', usersRouter)
app.use('/agent-hires', agentHiresRouter)
app.use('/activity', activityRouter)
app.use('/markets', marketsRouter)

app.use(errorHandler)

// HTTP + WebSocket server
const server = http.createServer(app)
startWsServer(server)
startAlpacaStream(['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'TSLA', 'META', 'AMZN', 'AMD'])

// Cron jobs
startMarketDataCron()
startAgentCrons()
startRecommendationCron()
startMorningBriefCron()
startScheduledJobsCron()
startExpireChallengesCron()
startDividendCron()
startSplitCron()

server.listen(PORT, () => {
  console.log(`Mockket API running on port ${PORT}`)
})

function shutdown() {
  console.log('[server] shutting down, closing Alpaca stream...')
  stopAlpacaStream()
  server.close(() => process.exit(0))
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
