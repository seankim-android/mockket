import 'express-async-errors'
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
import { startMarketDataCron } from './cron/sync-market-data'
import { startAgentCrons } from './cron/agent-rebalance'
import { startRecommendationCron } from './cron/generate-recommendations'
import { startMorningBriefCron, startScheduledJobsCron } from './cron/morning-briefs'
import { startExpireChallengesCron } from './cron/expire-challenges'
import { startDividendCron } from './cron/dividend-credits'
import { startSplitCron } from './cron/split-adjustments'
import { startAlpacaStream } from './ws/alpaca-stream'
import { startWsServer } from './ws/server'

dotenv.config()

const app = express()
const PORT = process.env.PORT ?? 3000

app.use(helmet())
app.use(cors({ origin: '*' })) // tighten in production
app.use(express.json())

// Health check
app.get('/health', (_req, res) => res.json({ ok: true }))

// Routes
app.use('/portfolio', portfolioRouter)
app.use('/trades', tradesRouter)
app.use('/recommendations', recommendationsRouter)
app.use('/challenges', challengesRouter)
app.use('/webhooks', webhooksRouter)
app.use('/config', configRouter)
app.use('/users', usersRouter)
app.use('/agent-hires', agentHiresRouter)

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
