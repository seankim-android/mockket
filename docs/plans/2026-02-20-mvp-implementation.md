# Mockket MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the full Mockket MVP — paper trading app with virtual ledger, advisory AI agents, challenges, leaderboard, and RevenueCat IAP.

**Architecture:** Alpaca is a read-only price feed; all portfolio state lives in Postgres (virtual ledger). The backend is a Node.js/Express API with WebSocket price fan-out via Redis pub/sub. The mobile app is Expo Router (React Native) consuming the API via TanStack Query.

**Tech Stack:** Node.js + Express + Postgres (pg) + Redis (ioredis) + Alpaca Markets API + Polygon.io + Supabase Auth + FCM + RevenueCat (`react-native-purchases`) + Expo Router

---

## Phase 1: Backend Foundation

### Task 1: Install backend dependencies

**Files:**
- Modify: `packages/api/package.json`

**Step 1: Add dependencies**

```bash
cd packages/api
yarn add express cors helmet express-async-errors ioredis pg dotenv node-cron axios
yarn add -D @types/express @types/cors @types/pg @types/node nodemon ts-node
```

**Step 2: Update `package.json` scripts**

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit"
  }
}
```

**Step 3: Commit**

```bash
git add packages/api/package.json
git commit -m "chore: install api dependencies"
```

---

### Task 2: Database schema and migrations

**Files:**
- Create: `packages/api/src/db/schema.sql`
- Create: `packages/api/src/db/client.ts`

**Step 1: Write `schema.sql`**

```sql
-- Users (auth managed by Supabase, this extends their profile)
CREATE TABLE users (
  id UUID PRIMARY KEY, -- matches Supabase auth.users.id
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  portfolio_cash NUMERIC(14,2) NOT NULL DEFAULT 100000.00,
  reset_count INTEGER NOT NULL DEFAULT 0,
  leaderboard_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Holdings: current positions per user (or agent segment)
CREATE TABLE holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  agent_hire_id UUID, -- NULL = self-managed, set = agent segment
  challenge_id UUID, -- NULL = main portfolio, set = challenge portfolio
  ticker TEXT NOT NULL,
  quantity NUMERIC(14,6) NOT NULL DEFAULT 0,
  avg_cost NUMERIC(14,4) NOT NULL, -- average cost basis per share
  UNIQUE(user_id, agent_hire_id, challenge_id, ticker)
);

-- Trades: permanent ledger (never deleted)
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  agent_id TEXT, -- agent slug, NULL = user trade
  agent_hire_id UUID,
  ticker TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('buy', 'sell')),
  quantity NUMERIC(14,6) NOT NULL,
  price_at_execution NUMERIC(14,4) NOT NULL,
  rationale TEXT NOT NULL DEFAULT '',
  challenge_id UUID,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agent hires
CREATE TABLE agent_hires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  agent_id TEXT NOT NULL,
  allocated_cash NUMERIC(14,2) NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('advisory', 'autopilot')) DEFAULT 'advisory',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_paused BOOLEAN NOT NULL DEFAULT FALSE,
  hired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paused_at TIMESTAMPTZ
);

-- Agent recommendations
CREATE TABLE agent_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  agent_hire_id UUID NOT NULL REFERENCES agent_hires(id),
  agent_id TEXT NOT NULL,
  challenge_id UUID,
  ticker TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('buy', 'sell')),
  quantity NUMERIC(14,6) NOT NULL,
  rationale TEXT NOT NULL, -- never returned before acted_at is set
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'expired')) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  acted_at TIMESTAMPTZ
);

-- Challenges
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  agent_id TEXT, -- NULL = friend challenge
  opponent_user_id UUID REFERENCES users(id),
  duration TEXT NOT NULL CHECK (duration IN ('1w', '1m', '3m')),
  starting_balance NUMERIC(14,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'completed', 'forfeited', 'expired')) DEFAULT 'pending',
  is_forfeited BOOLEAN NOT NULL DEFAULT FALSE,
  invite_token TEXT UNIQUE,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  winner_id UUID REFERENCES users(id),
  started_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cached market data (dividends, earnings, splits from Polygon)
CREATE TABLE dividend_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  ex_date DATE NOT NULL,
  amount_per_share NUMERIC(10,4) NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ticker, ex_date)
);

CREATE TABLE earnings_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  report_date DATE NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ticker, report_date)
);

-- App version config (force/soft update)
CREATE TABLE app_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'both')),
  version TEXT NOT NULL,
  minimum_version TEXT NOT NULL,
  update_mode TEXT CHECK (update_mode IN ('hard', 'soft')),
  release_date DATE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE changelog_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_version_id UUID NOT NULL REFERENCES app_versions(id),
  type TEXT NOT NULL CHECK (type IN ('new', 'improved', 'fixed')),
  text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- FTUE tracking
CREATE TABLE ftue_progress (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  viewed_marcus_profile BOOLEAN NOT NULL DEFAULT FALSE,
  made_first_trade BOOLEAN NOT NULL DEFAULT FALSE,
  started_challenge BOOLEAN NOT NULL DEFAULT FALSE,
  agent_intro_sent BOOLEAN NOT NULL DEFAULT FALSE,
  first_trade_annotation_shown BOOLEAN NOT NULL DEFAULT FALSE,
  day2_card_shown BOOLEAN NOT NULL DEFAULT FALSE
);

-- PDT tracking (day trades in 5-day window)
CREATE TABLE day_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  ticker TEXT NOT NULL,
  traded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notification preferences
CREATE TABLE notification_prefs (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  advisory_recommendations BOOLEAN NOT NULL DEFAULT TRUE,
  agent_reactions BOOLEAN NOT NULL DEFAULT TRUE,
  challenge_milestones BOOLEAN NOT NULL DEFAULT TRUE,
  portfolio_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  recommendation_expiry BOOLEAN NOT NULL DEFAULT TRUE,
  morning_briefs BOOLEAN NOT NULL DEFAULT TRUE
);

-- FCM tokens
CREATE TABLE fcm_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(token)
);
```

**Step 2: Write `packages/api/src/db/client.ts`**

```typescript
import { Pool } from 'pg'

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
})

// Test connection on startup
db.query('SELECT 1').catch((err) => {
  console.error('DB connection failed:', err)
  process.exit(1)
})
```

**Step 3: Run migrations**

```bash
psql $DATABASE_URL < packages/api/src/db/schema.sql
```

**Step 4: Commit**

```bash
git add packages/api/src/db/
git commit -m "feat: add database schema and pg client"
```

---

### Task 3: Express server setup with auth middleware

**Files:**
- Modify: `packages/api/src/index.ts`
- Create: `packages/api/src/middleware/auth.ts`
- Create: `packages/api/src/middleware/error.ts`
- Create: `packages/api/src/lib/redis.ts`

**Step 1: Write `packages/api/src/lib/redis.ts`**

```typescript
import Redis from 'ioredis'

export const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,
})

redis.on('error', (err) => console.error('Redis error:', err))
```

**Step 2: Write `packages/api/src/middleware/auth.ts`**

```typescript
import { Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' })

  res.locals.userId = user.id
  next()
}
```

**Step 3: Write `packages/api/src/middleware/error.ts`**

```typescript
import { Request, Response, NextFunction } from 'express'

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  console.error(err)
  res.status(500).json({ error: err.message || 'Internal server error' })
}
```

**Step 4: Update `packages/api/src/index.ts`**

```typescript
import 'express-async-errors'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { errorHandler } from './middleware/error'

dotenv.config()

const app = express()
const PORT = process.env.PORT ?? 3000

app.use(helmet())
app.use(cors({ origin: '*' })) // tighten in production
app.use(express.json())

// Health check
app.get('/health', (_req, res) => res.json({ ok: true }))

// Routes (added in later tasks)

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Mockket API running on port ${PORT}`)
})
```

**Step 5: Add `.env.example`**

```bash
DATABASE_URL=postgres://localhost:5432/mockket
REDIS_URL=redis://localhost:6379
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ALPACA_API_KEY=
ALPACA_API_SECRET=
ALPACA_BASE_URL=https://data.alpaca.markets
POLYGON_API_KEY=
FIREBASE_PROJECT_ID=
FIREBASE_SERVICE_ACCOUNT=
PORT=3000
```

**Step 6: Commit**

```bash
git add packages/api/src/
git commit -m "feat: express server with auth middleware and redis client"
```

---

## Phase 2: Market Data Layer

### Task 4: Alpaca price client

**Files:**
- Create: `packages/api/src/lib/alpaca.ts`

**Step 1: Write `packages/api/src/lib/alpaca.ts`**

```typescript
import axios from 'axios'

const client = axios.create({
  baseURL: process.env.ALPACA_BASE_URL,
  headers: {
    'APCA-API-KEY-ID': process.env.ALPACA_API_KEY!,
    'APCA-API-SECRET-KEY': process.env.ALPACA_API_SECRET!,
  },
})

export interface Quote {
  ticker: string
  ask: number
  bid: number
  mid: number
}

// Fetch latest quote for a single ticker
export async function getQuote(ticker: string): Promise<Quote> {
  const { data } = await client.get(`/v2/stocks/${ticker}/quotes/latest`)
  const q = data.quote
  const ask = q.ap ?? q.ap // ask price
  const bid = q.bp         // bid price
  return {
    ticker,
    ask,
    bid,
    mid: (ask + bid) / 2,
  }
}

// Fetch quotes for multiple tickers
export async function getQuotes(tickers: string[]): Promise<Quote[]> {
  const symbols = tickers.join(',')
  const { data } = await client.get(`/v2/stocks/quotes/latest?symbols=${symbols}`)
  return Object.entries(data.quotes).map(([ticker, q]: [string, any]) => ({
    ticker,
    ask: q.ap,
    bid: q.bp,
    mid: (q.ap + q.bp) / 2,
  }))
}

// Check if market is currently open
export async function getMarketStatus(): Promise<'open' | 'closed' | 'pre-market' | 'after-hours'> {
  const { data } = await client.get('/v1/clock')
  if (data.is_open) return 'open'
  // Determine pre-market / after-hours by time
  const now = new Date()
  const etHour = parseInt(new Intl.DateTimeFormat('en-US', {
    hour: 'numeric', hour12: false, timeZone: 'America/New_York'
  }).format(now))
  if (etHour >= 4 && etHour < 9) return 'pre-market'
  if (etHour >= 16 && etHour < 20) return 'after-hours'
  return 'closed'
}
```

**Step 2: Write tests**

Create `packages/api/src/lib/__tests__/alpaca.test.ts`:

```typescript
// These are integration tests — run with real Alpaca keys
// For unit tests, mock the axios calls

import { getQuote } from '../alpaca'

describe('getQuote', () => {
  it('returns bid, ask, and mid for a valid ticker', async () => {
    const quote = await getQuote('AAPL')
    expect(quote.ticker).toBe('AAPL')
    expect(quote.ask).toBeGreaterThan(0)
    expect(quote.bid).toBeGreaterThan(0)
    expect(quote.mid).toBe((quote.ask + quote.bid) / 2)
  })
})
```

**Step 3: Commit**

```bash
git add packages/api/src/lib/alpaca.ts
git commit -m "feat: alpaca price client (read-only)"
```

---

### Task 5: Polygon.io client and nightly data sync

**Files:**
- Create: `packages/api/src/lib/polygon.ts`
- Create: `packages/api/src/cron/sync-market-data.ts`

**Step 1: Write `packages/api/src/lib/polygon.ts`**

```typescript
import axios from 'axios'

const client = axios.create({
  baseURL: 'https://api.polygon.io',
  params: { apiKey: process.env.POLYGON_API_KEY },
})

export interface DividendEvent {
  ticker: string
  exDate: string // ISO date
  amountPerShare: number
}

export interface EarningsEvent {
  ticker: string
  reportDate: string // ISO date
}

// Fetch upcoming dividends for a list of tickers
export async function getDividends(tickers: string[]): Promise<DividendEvent[]> {
  const results: DividendEvent[] = []
  for (const ticker of tickers) {
    const { data } = await client.get(`/v3/reference/dividends`, {
      params: { ticker, limit: 5 },
    })
    for (const d of data.results ?? []) {
      results.push({
        ticker,
        exDate: d.ex_dividend_date,
        amountPerShare: d.cash_amount,
      })
    }
  }
  return results
}

// Fetch upcoming earnings dates
export async function getEarnings(tickers: string[]): Promise<EarningsEvent[]> {
  const results: EarningsEvent[] = []
  for (const ticker of tickers) {
    const { data } = await client.get(`/vX/reference/financials`, {
      params: { ticker, limit: 2 },
    })
    for (const e of data.results ?? []) {
      results.push({ ticker, reportDate: e.period_of_report_date })
    }
  }
  return results
}
```

**Step 2: Write `packages/api/src/cron/sync-market-data.ts`**

```typescript
import cron from 'node-cron'
import { db } from '../db/client'
import { getDividends, getEarnings } from '../lib/polygon'

// The tickers we track — in production, derive from all user holdings
const TRACKED_TICKERS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'TSLA', 'META', 'JPM', 'JNJ', 'V']

export async function syncMarketData() {
  console.log('[cron] syncing market data from Polygon...')

  const [dividends, earnings] = await Promise.all([
    getDividends(TRACKED_TICKERS),
    getEarnings(TRACKED_TICKERS),
  ])

  // Upsert dividends
  for (const d of dividends) {
    await db.query(
      `INSERT INTO dividend_events (ticker, ex_date, amount_per_share)
       VALUES ($1, $2, $3)
       ON CONFLICT (ticker, ex_date) DO UPDATE SET amount_per_share = $3, fetched_at = NOW()`,
      [d.ticker, d.exDate, d.amountPerShare]
    )
  }

  // Upsert earnings
  for (const e of earnings) {
    await db.query(
      `INSERT INTO earnings_calendar (ticker, report_date)
       VALUES ($1, $2)
       ON CONFLICT (ticker, report_date) DO NOTHING`,
      [e.ticker, e.reportDate]
    )
  }

  console.log(`[cron] synced ${dividends.length} dividends, ${earnings.length} earnings events`)
}

// Run nightly at 2am ET
export function startMarketDataCron() {
  cron.schedule('0 2 * * *', syncMarketData, { timezone: 'America/New_York' })
}
```

**Step 3: Commit**

```bash
git add packages/api/src/lib/polygon.ts packages/api/src/cron/sync-market-data.ts
git commit -m "feat: polygon.io client and nightly market data sync cron"
```

---

### Task 6: WebSocket price streaming server

**Files:**
- Create: `packages/api/src/ws/server.ts`
- Create: `packages/api/src/ws/alpaca-stream.ts`

**Step 1: Add ws dependency**

```bash
cd packages/api && yarn add ws && yarn add -D @types/ws
```

**Step 2: Write `packages/api/src/ws/alpaca-stream.ts`**

```typescript
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
```

**Step 3: Write `packages/api/src/ws/server.ts`**

```typescript
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
```

**Step 4: Commit**

```bash
git add packages/api/src/ws/
git commit -m "feat: websocket price streaming server with redis pub/sub"
```

---

## Phase 3: Virtual Ledger

### Task 7: Virtual ledger — trade execution

**Files:**
- Create: `packages/api/src/lib/ledger.ts`
- Create: `packages/api/src/lib/__tests__/ledger.test.ts`

**Step 1: Write the failing test**

Create `packages/api/src/lib/__tests__/ledger.test.ts`:

```typescript
import { executeTrade, getPortfolio } from '../ledger'

// These tests use a test database — set TEST_DATABASE_URL env var
describe('ledger', () => {
  describe('executeTrade (buy)', () => {
    it('deducts cash and creates holding at ask price', async () => {
      const userId = 'test-user-1'
      const trade = {
        userId,
        ticker: 'AAPL',
        action: 'buy' as const,
        quantity: 10,
        price: 185.50, // ask price
        rationale: '',
      }

      await executeTrade(trade)
      const portfolio = await getPortfolio(userId)

      expect(portfolio.cash).toBe(100000 - 10 * 185.50)
      const holding = portfolio.holdings.find(h => h.ticker === 'AAPL')
      expect(holding?.quantity).toBe(10)
      expect(holding?.avgCost).toBe(185.50)
    })
  })

  describe('executeTrade (sell)', () => {
    it('returns cash at bid price and reduces holding', async () => {
      // Assumes buy test above ran first
      const userId = 'test-user-1'
      const trade = {
        userId,
        ticker: 'AAPL',
        action: 'sell' as const,
        quantity: 5,
        price: 184.80, // bid price
        rationale: '',
      }

      await executeTrade(trade)
      const portfolio = await getPortfolio(userId)

      const holding = portfolio.holdings.find(h => h.ticker === 'AAPL')
      expect(holding?.quantity).toBe(5)
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
cd packages/api && ts-node -e "require('./src/lib/__tests__/ledger.test.ts')"
```
Expected: FAIL — `ledger` module not found.

**Step 3: Write `packages/api/src/lib/ledger.ts`**

```typescript
import { db } from '../db/client'

interface TradeInput {
  userId: string
  agentId?: string
  agentHireId?: string
  challengeId?: string
  ticker: string
  action: 'buy' | 'sell'
  quantity: number
  price: number // ask for buy, bid for sell
  rationale?: string
}

export async function executeTrade(trade: TradeInput): Promise<void> {
  const client = await db.connect()
  try {
    await client.query('BEGIN')

    if (trade.action === 'buy') {
      const cost = trade.quantity * trade.price

      // Deduct cash
      const { rows } = await client.query(
        `UPDATE users SET portfolio_cash = portfolio_cash - $1, updated_at = NOW()
         WHERE id = $2 AND portfolio_cash >= $1 RETURNING id`,
        [cost, trade.userId]
      )
      if (rows.length === 0) throw new Error('Insufficient cash')

      // Upsert holding (update avg cost on additional buys)
      await client.query(
        `INSERT INTO holdings (user_id, agent_hire_id, challenge_id, ticker, quantity, avg_cost)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, agent_hire_id, challenge_id, ticker)
         DO UPDATE SET
           avg_cost = (holdings.quantity * holdings.avg_cost + $5 * $6) / (holdings.quantity + $5),
           quantity = holdings.quantity + $5`,
        [trade.userId, trade.agentHireId ?? null, trade.challengeId ?? null,
         trade.ticker, trade.quantity, trade.price]
      )
    } else {
      // Sell: reduce holding, return cash at bid price
      const proceeds = trade.quantity * trade.price

      await client.query(
        `UPDATE holdings SET quantity = quantity - $1
         WHERE user_id = $2 AND ticker = $3 AND agent_hire_id IS NOT DISTINCT FROM $4
         AND challenge_id IS NOT DISTINCT FROM $5 AND quantity >= $1`,
        [trade.quantity, trade.userId, trade.ticker,
         trade.agentHireId ?? null, trade.challengeId ?? null]
      )

      await client.query(
        `UPDATE users SET portfolio_cash = portfolio_cash + $1, updated_at = NOW()
         WHERE id = $2`,
        [proceeds, trade.userId]
      )

      // Clean up zero-quantity holdings
      await client.query(
        `DELETE FROM holdings WHERE user_id = $1 AND ticker = $2 AND quantity = 0`,
        [trade.userId, trade.ticker]
      )
    }

    // Record trade in permanent ledger
    await client.query(
      `INSERT INTO trades (user_id, agent_id, agent_hire_id, ticker, action, quantity,
        price_at_execution, rationale, challenge_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [trade.userId, trade.agentId ?? null, trade.agentHireId ?? null,
       trade.ticker, trade.action, trade.quantity, trade.price,
       trade.rationale ?? '', trade.challengeId ?? null]
    )

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function getPortfolio(userId: string) {
  const [userRow, holdingsRow] = await Promise.all([
    db.query(`SELECT portfolio_cash FROM users WHERE id = $1`, [userId]),
    db.query(
      `SELECT ticker, quantity, avg_cost FROM holdings
       WHERE user_id = $1 AND agent_hire_id IS NULL AND challenge_id IS NULL`,
      [userId]
    ),
  ])

  return {
    cash: Number(userRow.rows[0]?.portfolio_cash ?? 0),
    holdings: holdingsRow.rows.map(h => ({
      ticker: h.ticker,
      quantity: Number(h.quantity),
      avgCost: Number(h.avg_cost),
    })),
  }
}
```

**Step 4: Commit**

```bash
git add packages/api/src/lib/ledger.ts packages/api/src/lib/__tests__/ledger.test.ts
git commit -m "feat: virtual ledger with atomic trade execution"
```

---

### Task 8: Portfolio and trade routes

**Files:**
- Create: `packages/api/src/routes/portfolio.ts`
- Create: `packages/api/src/routes/trades.ts`
- Modify: `packages/api/src/index.ts`

**Step 1: Write `packages/api/src/routes/portfolio.ts`**

```typescript
import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { getPortfolio } from '../lib/ledger'
import { db } from '../db/client'

export const portfolioRouter = Router()

// GET /portfolio — returns cash + holdings + basic P&L
portfolioRouter.get('/', requireAuth, async (_req, res) => {
  const userId = res.locals.userId
  const portfolio = await getPortfolio(userId)

  // Fetch all-time trades for P&L annotation
  const { rows: trades } = await db.query(
    `SELECT ticker, action, quantity, price_at_execution, executed_at
     FROM trades WHERE user_id = $1 ORDER BY executed_at DESC LIMIT 100`,
    [userId]
  )

  res.json({ ...portfolio, recentTrades: trades })
})
```

**Step 2: Write `packages/api/src/routes/trades.ts`**

```typescript
import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { executeTrade } from '../lib/ledger'
import { getQuote, getMarketStatus } from '../lib/alpaca'
import { db } from '../db/client'

export const tradesRouter = Router()

// POST /trades — execute a market order
tradesRouter.post('/', requireAuth, async (req, res) => {
  const userId = res.locals.userId
  const { ticker, action, quantity, challengeId, agentHireId } = req.body

  if (!ticker || !action || !quantity) {
    return res.status(400).json({ error: 'ticker, action, and quantity are required' })
  }

  const status = await getMarketStatus()
  const quote = await getQuote(ticker)

  // Buy at ask, sell at bid
  const price = action === 'buy' ? quote.ask : quote.bid

  // Queue after-hours orders (stored as pending, not executed immediately)
  if (status !== 'open' && action !== undefined) {
    // TODO: queued order table — for MVP, inform client that order will queue
    // For simplicity in V1: still execute at current price (paper trading)
  }

  await executeTrade({ userId, ticker, action, quantity, price, challengeId, agentHireId })

  // Check PDT warning (day trades in 5-day window)
  if (action === 'buy' || action === 'sell') {
    // Record day trade if same ticker was traded today (simplified)
    await db.query(
      `INSERT INTO day_trades (user_id, ticker) VALUES ($1, $2)`,
      [userId, ticker]
    )
  }

  res.json({ ok: true, price, executedAt: new Date().toISOString() })
})

// GET /trades — trade history for current user
tradesRouter.get('/', requireAuth, async (req, res) => {
  const userId = res.locals.userId
  const { rows } = await db.query(
    `SELECT * FROM trades WHERE user_id = $1 ORDER BY executed_at DESC LIMIT 50`,
    [userId]
  )
  res.json(rows)
})
```

**Step 3: Register routes in `index.ts`**

```typescript
import { portfolioRouter } from './routes/portfolio'
import { tradesRouter } from './routes/trades'

app.use('/portfolio', portfolioRouter)
app.use('/trades', tradesRouter)
```

**Step 4: Commit**

```bash
git add packages/api/src/routes/
git commit -m "feat: portfolio and trades routes"
```

---

## Phase 4: Agent System

### Task 9: Add `preview()` to agent interface and update stubs

**Files:**
- Modify: `packages/shared/src/types/agent.ts`
- Modify: `packages/agents/src/types.ts`
- Modify: `packages/agents/src/marcus-bull-chen/index.ts`
- Modify: `packages/agents/src/priya-sharma/index.ts`

**Step 1: Add `ProposedTrade` to shared types**

In `packages/shared/src/types/agent.ts`, add:

```typescript
export interface ProposedTrade {
  ticker: string
  action: 'buy' | 'sell'
  quantity: number
  estimatedValue: number   // quantity * current price
  portfolioValue: number   // user's total portfolio value
}
```

**Step 2: Add `preview()` to `packages/agents/src/types.ts`**

```typescript
import type { ProposedTrade } from '@mockket/shared'

export interface AgentModule extends AgentMeta {
  rebalance(portfolio: Portfolio, marketData: MarketData): Promise<Trade[]>
  getRationale(trade: Trade): string
  react(userTrade: Trade): string
  preview(proposed: ProposedTrade): string
}
```

**Step 3: Add `preview()` to Marcus**

```typescript
preview(proposed: ProposedTrade): string {
  const pct = ((proposed.estimatedValue / proposed.portfolioValue) * 100).toFixed(1)
  if (proposed.action === 'buy') {
    return Number(pct) < 5
      ? `Small position on a breakout name — I'd go bigger, but I get it.`
      : `Now we're talking. ${pct}% allocation on $${proposed.ticker}. Let's ride.`
  }
  return `Trimming $${proposed.ticker}? I'd hold, but your call.`
},
```

**Step 4: Add `preview()` to Priya**

```typescript
preview(proposed: ProposedTrade): string {
  if (proposed.action === 'buy') {
    return `I'd want to check the P/E before committing to $${proposed.ticker}. Patience is free.`
  }
  return `Selling $${proposed.ticker}? Make sure you're not selling discipline, not just a position.`
},
```

**Step 5: Commit**

```bash
git add packages/shared/src/types/agent.ts packages/agents/src/
git commit -m "feat: add preview() to agent interface and stubs"
```

---

### Task 10: Marcus rebalance strategy (momentum)

**Files:**
- Modify: `packages/agents/src/marcus-bull-chen/index.ts`

**Step 1: Write the logic**

Marcus's strategy: each rebalance, find top-volume movers in his holdings. Buy breakouts (price up >2% from previous close with high volume). Cut losers (down >5% from avg cost).

```typescript
async rebalance(portfolio: Portfolio, marketData: MarketData): Promise<Trade[]> {
  const trades: Trade[] = []
  const totalValue = portfolio.cash +
    portfolio.holdings.reduce((sum, h) => sum + h.quantity * (marketData.prices[h.ticker] ?? 0), 0)

  // Cut losers: sell anything down >5% from avg cost
  for (const holding of portfolio.holdings) {
    const currentPrice = marketData.prices[holding.ticker]
    if (!currentPrice) continue
    const lossPercent = (currentPrice - holding.avgCost) / holding.avgCost
    if (lossPercent < -0.05) {
      trades.push({
        id: crypto.randomUUID(),
        userId: '', // filled by cron runner
        agentId: 'marcus-bull-chen',
        ticker: holding.ticker,
        action: 'sell',
        quantity: holding.quantity,
        priceAtExecution: currentPrice,
        rationale: `$${holding.ticker} down ${(lossPercent * 100).toFixed(1)}% from cost basis — cutting the loser, rotating capital.`,
        challengeId: null,
        executedAt: new Date().toISOString(),
      })
    }
  }

  // Buy breakout: allocate up to 10% of portfolio to a single new position
  // In real implementation, would use volume data from marketData
  // For now: buy the top performer in a watchlist if not already held
  const watchlist = ['NVDA', 'TSLA', 'AMD', 'META', 'AMZN']
  for (const ticker of watchlist) {
    const price = marketData.prices[ticker]
    if (!price) continue
    const alreadyHeld = portfolio.holdings.some(h => h.ticker === ticker)
    if (alreadyHeld) continue
    const allocation = Math.min(totalValue * 0.10, portfolio.cash)
    if (allocation < 1000) continue
    const quantity = Math.floor(allocation / price)
    if (quantity < 1) continue

    trades.push({
      id: crypto.randomUUID(),
      userId: '',
      agentId: 'marcus-bull-chen',
      ticker,
      action: 'buy',
      quantity,
      priceAtExecution: price,
      rationale: `Volume spike on $${ticker}, classic breakout setup, went in heavy.`,
      challengeId: null,
      executedAt: new Date().toISOString(),
    })
    break // one new position per rebalance
  }

  return trades
},
```

**Step 2: Commit**

```bash
git add packages/agents/src/marcus-bull-chen/index.ts
git commit -m "feat: marcus momentum rebalance strategy"
```

---

### Task 11: Priya rebalance strategy (value)

**Files:**
- Modify: `packages/agents/src/priya-sharma/index.ts`

**Step 1: Write the logic**

Priya's strategy: hold long, trim only if fundamentally overvalued (price >20% above avg cost and held >30 days). Add to positions with attractive entry (price <avg cost).

```typescript
async rebalance(portfolio: Portfolio, marketData: MarketData): Promise<Trade[]> {
  const trades: Trade[] = []

  // Priya rarely trades — only trim extreme runners or add to dips
  for (const holding of portfolio.holdings) {
    const currentPrice = marketData.prices[holding.ticker]
    if (!currentPrice) continue
    const gainPercent = (currentPrice - holding.avgCost) / holding.avgCost

    // Trim if up >25% — take some profit
    if (gainPercent > 0.25) {
      const trimQuantity = Math.floor(holding.quantity * 0.25) // trim 25%
      if (trimQuantity < 1) continue
      trades.push({
        id: crypto.randomUUID(),
        userId: '',
        agentId: 'priya-sharma',
        ticker: holding.ticker,
        action: 'sell',
        quantity: trimQuantity,
        priceAtExecution: currentPrice,
        rationale: `$${holding.ticker} up ${(gainPercent * 100).toFixed(1)}%. Trimming 25% to rebalance — strong conviction, but discipline matters.`,
        challengeId: null,
        executedAt: new Date().toISOString(),
      })
    }
  }

  return trades
},
```

**Step 2: Commit**

```bash
git add packages/agents/src/priya-sharma/index.ts
git commit -m "feat: priya value rebalance strategy"
```

---

### Task 12: Agent cron runner

**Files:**
- Create: `packages/api/src/cron/agent-rebalance.ts`

**Step 1: Write the cron**

```typescript
import cron from 'node-cron'
import { db } from '../db/client'
import { executeTrade } from '../lib/ledger'
import { getQuotes } from '../lib/alpaca'
import { marcusBullChen } from '@mockket/agents'
import { priyaSharma } from '@mockket/agents'
import type { AgentModule } from '@mockket/agents'

const AGENTS: AgentModule[] = [marcusBullChen, priyaSharma]

async function runAgentRebalance(agentId: string) {
  // Find all active hires for this agent
  const { rows: hires } = await db.query(
    `SELECT ah.*, u.portfolio_cash
     FROM agent_hires ah
     JOIN users u ON u.id = ah.user_id
     WHERE ah.agent_id = $1 AND ah.is_active = TRUE AND ah.is_paused = FALSE`,
    [agentId]
  )

  const agent = AGENTS.find(a => a.id === agentId)
  if (!agent) return

  for (const hire of hires) {
    // Get agent's holdings for this hire
    const { rows: holdingRows } = await db.query(
      `SELECT ticker, quantity, avg_cost FROM holdings
       WHERE user_id = $1 AND agent_hire_id = $2`,
      [hire.user_id, hire.id]
    )

    const tickers = holdingRows.map((h: any) => h.ticker)
    const prices = tickers.length > 0 ? await getQuotes(tickers) : []
    const priceMap = Object.fromEntries(prices.map(p => [p.ticker, p.mid]))

    const portfolio = {
      cash: Number(hire.allocated_cash),
      holdings: holdingRows.map((h: any) => ({
        ticker: h.ticker,
        quantity: Number(h.quantity),
        avgCost: Number(h.avg_cost),
        currentPrice: priceMap[h.ticker] ?? 0,
      })),
    }

    const trades = await agent.rebalance(portfolio, {
      prices: priceMap,
      timestamp: new Date().toISOString(),
    })

    for (const trade of trades) {
      const quote = await getQuotes([trade.ticker])
      const price = trade.action === 'buy' ? quote[0]?.ask : quote[0]?.bid
      if (!price) continue

      await executeTrade({
        userId: hire.user_id,
        agentId: agent.id,
        agentHireId: hire.id,
        ticker: trade.ticker,
        action: trade.action,
        quantity: trade.quantity,
        price,
        rationale: trade.rationale,
      })
    }
  }
}

// Stocks: daily at 9:35am ET (5 min after market open)
export function startAgentCrons() {
  cron.schedule('35 9 * * 1-5', () => {
    runAgentRebalance('marcus-bull-chen')
    runAgentRebalance('priya-sharma')
  }, { timezone: 'America/New_York' })
}
```

**Step 2: Commit**

```bash
git add packages/api/src/cron/agent-rebalance.ts
git commit -m "feat: agent rebalance cron runner"
```

---

## Phase 5: Advisory Recommendation Flow

### Task 13: Recommendation routes (server-side rationale hiding)

**Files:**
- Create: `packages/api/src/routes/recommendations.ts`

**Step 1: Write routes**

```typescript
import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { db } from '../db/client'
import { executeTrade } from '../lib/ledger'
import { getQuote } from '../lib/alpaca'

export const recommendationsRouter = Router()

// GET /recommendations/:id/preview — NO rationale returned
recommendationsRouter.get('/:id/preview', requireAuth, async (req, res) => {
  const userId = res.locals.userId
  const { rows } = await db.query(
    `SELECT id, agent_id, ticker, action, quantity, status, expires_at, created_at
     FROM agent_recommendations
     WHERE id = $1 AND user_id = $2`,
    [req.params.id, userId]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Not found' })
  // Note: rationale deliberately excluded from this endpoint
  res.json(rows[0])
})

// GET /recommendations/:id/rationale — only after action taken
recommendationsRouter.get('/:id/rationale', requireAuth, async (req, res) => {
  const userId = res.locals.userId
  const { rows } = await db.query(
    `SELECT rationale, status, acted_at FROM agent_recommendations
     WHERE id = $1 AND user_id = $2`,
    [req.params.id, userId]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Not found' })
  if (rows[0].status === 'pending' || rows[0].status === 'expired') {
    return res.status(403).json({ error: 'Rationale not available yet' })
  }
  res.json({ rationale: rows[0].rationale, actedAt: rows[0].acted_at })
})

// PATCH /recommendations/:id — approve or reject
recommendationsRouter.patch('/:id', requireAuth, async (req, res) => {
  const userId = res.locals.userId
  const { action } = req.body // 'approved' | 'rejected'

  if (!['approved', 'rejected'].includes(action)) {
    return res.status(400).json({ error: 'action must be approved or rejected' })
  }

  const { rows } = await db.query(
    `SELECT * FROM agent_recommendations
     WHERE id = $1 AND user_id = $2 AND status = 'pending'`,
    [req.params.id, userId]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Not found or already acted on' })

  const rec = rows[0]
  if (new Date(rec.expires_at) < new Date()) {
    return res.status(400).json({ error: 'Recommendation has expired' })
  }

  await db.query(
    `UPDATE agent_recommendations SET status = $1, acted_at = NOW() WHERE id = $2`,
    [action, rec.id]
  )

  if (action === 'approved') {
    const quote = await getQuote(rec.ticker)
    const price = rec.action === 'buy' ? quote.ask : quote.bid
    await executeTrade({
      userId,
      agentId: rec.agent_id,
      agentHireId: rec.agent_hire_id,
      ticker: rec.ticker,
      action: rec.action,
      quantity: Number(rec.quantity),
      price,
      rationale: rec.rationale, // stored in trade, not shown to user until post-action
      challengeId: rec.challenge_id,
    })
  }

  res.json({ ok: true })
})

// GET /recommendations — list pending recommendations for user
recommendationsRouter.get('/', requireAuth, async (_req, res) => {
  const userId = res.locals.userId
  const { rows } = await db.query(
    `SELECT id, agent_id, ticker, action, quantity, status, expires_at, created_at
     FROM agent_recommendations
     WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [userId]
  )
  res.json(rows)
})
```

**Step 2: Register in `index.ts`**

```typescript
import { recommendationsRouter } from './routes/recommendations'
app.use('/recommendations', recommendationsRouter)
```

**Step 3: Commit**

```bash
git add packages/api/src/routes/recommendations.ts
git commit -m "feat: recommendation routes with server-side rationale hiding"
```

---

### Task 14: Advisory recommendation generation cron

**Files:**
- Create: `packages/api/src/cron/generate-recommendations.ts`
- Create: `packages/api/src/lib/fcm.ts`

**Step 1: Write `packages/api/src/lib/fcm.ts`**

```typescript
import axios from 'axios'

const FCM_URL = 'https://fcm.googleapis.com/fcm/send'

export async function sendPushNotification(token: string, title: string, body: string, data?: Record<string, string>) {
  await axios.post(FCM_URL, {
    to: token,
    notification: { title, body },
    data,
  }, {
    headers: {
      Authorization: `key=${process.env.FCM_SERVER_KEY}`,
    },
  })
}

export async function sendPushToUser(userId: string, title: string, body: string, data?: Record<string, string>, db?: any) {
  if (!db) return
  const { rows } = await db.query(
    `SELECT token FROM fcm_tokens WHERE user_id = $1`,
    [userId]
  )
  await Promise.all(rows.map((r: any) => sendPushNotification(r.token, title, body, data)))
}
```

**Step 2: Write `packages/api/src/cron/generate-recommendations.ts`**

```typescript
import cron from 'node-cron'
import { db } from '../db/client'
import { getQuote } from '../lib/alpaca'
import { marcusBullChen, priyaSharma } from '@mockket/agents'
import { sendPushToUser } from '../lib/fcm'

async function generateRecommendations(agentId: string) {
  const agent = agentId === 'marcus-bull-chen' ? marcusBullChen : priyaSharma

  // Find advisory hires for this agent
  const { rows: hires } = await db.query(
    `SELECT ah.*, u.portfolio_cash FROM agent_hires ah
     JOIN users u ON u.id = ah.user_id
     WHERE ah.agent_id = $1 AND ah.mode = 'advisory'
       AND ah.is_active = TRUE AND ah.is_paused = FALSE`,
    [agentId]
  )

  for (const hire of hires) {
    // Check: has this agent already sent a recommendation today?
    const { rows: existing } = await db.query(
      `SELECT id FROM agent_recommendations
       WHERE user_id = $1 AND agent_id = $2
         AND created_at > NOW() - INTERVAL '24 hours'
         AND status = 'pending'`,
      [hire.user_id, agentId]
    )
    if (existing.length > 0) continue

    // Generate a recommendation (simplified: pick a ticker from watchlist)
    const watchlist = agentId === 'marcus-bull-chen'
      ? ['NVDA', 'TSLA', 'AMD']
      : ['JNJ', 'MSFT', 'AAPL']

    const ticker = watchlist[Math.floor(Math.random() * watchlist.length)]
    const quote = await getQuote(ticker)
    const quantity = Math.floor(1000 / quote.ask) // ~$1000 position
    if (quantity < 1) continue

    const action = 'buy'
    const rationale = agent.getRationale({
      id: '',
      userId: hire.user_id,
      agentId,
      ticker,
      action,
      quantity,
      priceAtExecution: quote.ask,
      rationale: '',
      challengeId: null,
      executedAt: new Date().toISOString(),
    })

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const { rows } = await db.query(
      `INSERT INTO agent_recommendations
         (user_id, agent_hire_id, agent_id, ticker, action, quantity, rationale, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [hire.user_id, hire.id, agentId, ticker, action, quantity, rationale, expiresAt]
    )

    const recId = rows[0].id

    // Push notification
    await sendPushToUser(
      hire.user_id,
      `${agent.shortName} has a recommendation`,
      `${action.toUpperCase()} ${ticker} — tap to review`,
      { url: `https://mockket.app/recommendation/${recId}` },
      db
    )
  }
}

// Run once daily at 9:30am ET (market open)
export function startRecommendationCron() {
  cron.schedule('30 9 * * 1-5', () => {
    generateRecommendations('marcus-bull-chen')
    generateRecommendations('priya-sharma')
  }, { timezone: 'America/New_York' })
}
```

**Step 3: Commit**

```bash
git add packages/api/src/cron/generate-recommendations.ts packages/api/src/lib/fcm.ts
git commit -m "feat: advisory recommendation generation cron with push notifications"
```

---

## Phase 6: Challenges

### Task 15: Challenge routes

**Files:**
- Create: `packages/api/src/routes/challenges.ts`

**Step 1: Write routes**

```typescript
import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { db } from '../db/client'
import { randomBytes } from 'crypto'

export const challengesRouter = Router()

// POST /challenges — create a new challenge
challengesRouter.post('/', requireAuth, async (req, res) => {
  const userId = res.locals.userId
  const { agentId, duration, startingBalance, isPublic } = req.body

  if (!duration || !startingBalance) {
    return res.status(400).json({ error: 'duration and startingBalance required' })
  }

  // Check no active challenge is blocking a reset (not relevant here, but enforce max 1 active for free tier)
  const inviteToken = randomBytes(8).toString('hex')

  const { rows } = await db.query(
    `INSERT INTO challenges
       (user_id, agent_id, duration, starting_balance, status, invite_token, is_public)
     VALUES ($1, $2, $3, $4, 'active', $5, $6) RETURNING *`,
    [userId, agentId ?? null, duration, startingBalance, inviteToken, isPublic ?? false]
  )

  // Deduct starting balance from user's cash
  await db.query(
    `UPDATE users SET portfolio_cash = portfolio_cash - $1 WHERE id = $2`,
    [startingBalance, userId]
  )

  res.json(rows[0])
})

// GET /challenges — list user's challenges
challengesRouter.get('/', requireAuth, async (_req, res) => {
  const userId = res.locals.userId
  const { rows } = await db.query(
    `SELECT * FROM challenges WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  )
  res.json(rows)
})

// GET /challenges/:id — single challenge detail
challengesRouter.get('/:id', requireAuth, async (req, res) => {
  const userId = res.locals.userId
  const { rows } = await db.query(
    `SELECT * FROM challenges WHERE id = $1 AND (user_id = $2 OR opponent_user_id = $2)`,
    [req.params.id, userId]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Not found' })
  res.json(rows[0])
})

// GET /challenges/invite/:token — resolve invite token
challengesRouter.get('/invite/:token', async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, user_id, duration, starting_balance, status, created_at
     FROM challenges WHERE invite_token = $1`,
    [req.params.token]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Invalid invite' })
  res.json(rows[0])
})

// POST /challenges/invite/:token/accept — accept a friend challenge
challengesRouter.post('/invite/:token/accept', requireAuth, async (req, res) => {
  const userId = res.locals.userId
  const { rows } = await db.query(
    `SELECT * FROM challenges WHERE invite_token = $1 AND status = 'pending'`,
    [req.params.token]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Invalid or expired invite' })

  const challenge = rows[0]
  const endsAt = new Date()
  if (challenge.duration === '1w') endsAt.setDate(endsAt.getDate() + 7)
  if (challenge.duration === '1m') endsAt.setMonth(endsAt.getMonth() + 1)

  await db.query(
    `UPDATE challenges SET opponent_user_id = $1, status = 'active',
       started_at = NOW(), ends_at = $2 WHERE id = $3`,
    [userId, endsAt, challenge.id]
  )

  res.json({ ok: true })
})

// GET /leaderboard — top 50 by 30-day return
challengesRouter.get('/leaderboard', async (_req, res) => {
  // Simplified: rank by current portfolio value vs starting $100k
  const { rows } = await db.query(
    `SELECT u.display_name, u.portfolio_cash,
       ((u.portfolio_cash - 100000) / 100000 * 100) as return_pct
     FROM users u
     WHERE u.leaderboard_opt_in = TRUE
     ORDER BY return_pct DESC
     LIMIT 50`
  )
  res.json(rows)
})
```

**Step 2: Register in `index.ts`**

```typescript
import { challengesRouter } from './routes/challenges'
app.use('/challenges', challengesRouter)
```

**Step 3: Commit**

```bash
git add packages/api/src/routes/challenges.ts
git commit -m "feat: challenge routes with friend invite flow"
```

---

## Phase 7: Mobile — Auth & Navigation

### Task 16: Attach auth token to API client

**Files:**
- Modify: `apps/mobile/src/lib/api/client.ts`
- Modify: `apps/mobile/src/features/auth/store.ts`

**Step 1: Read the auth store**

Read `apps/mobile/src/features/auth/store.ts` to understand the existing Zustand store structure, then update the API client to pull the session token from the store.

**Step 2: Update `client.ts` to attach Bearer token**

```typescript
import { useAuthStore } from '../features/auth/store'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().session?.access_token

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  })

  if (!res.ok) throw new ApiError(res.status, await res.text())
  return res.json() as Promise<T>
}
```

**Step 3: Commit**

```bash
git add apps/mobile/src/lib/api/client.ts
git commit -m "feat: attach supabase auth token to api requests"
```

---

### Task 17: Tab layout and navigation structure

**Files:**
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`

**Step 1: Update tab layout to match spec**

```tsx
import { Tabs } from 'expo-router'
import { Home, TrendingUp, Users, Trophy, PieChart } from 'lucide-react-native'

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#6366F1' }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color }) => <Home color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="markets"
        options={{ title: 'Markets', tabBarIcon: ({ color }) => <TrendingUp color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="agents"
        options={{ title: 'Agents', tabBarIcon: ({ color }) => <Users color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="challenges"
        options={{ title: 'Challenges', tabBarIcon: ({ color }) => <Trophy color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{ title: 'Portfolio', tabBarIcon: ({ color }) => <PieChart color={color} size={22} /> }}
      />
    </Tabs>
  )
}
```

**Step 2: Add lucide-react-native**

```bash
cd apps/mobile && yarn add lucide-react-native
```

**Step 3: Commit**

```bash
git add apps/mobile/app/(tabs)/_layout.tsx
git commit -m "feat: tab navigation with correct 5-tab structure"
```

---

## Phase 8: Mobile — Core Screens

### Task 18: WebSocket price hook

**Files:**
- Modify: `apps/mobile/src/lib/ws/client.ts`
- Create: `apps/mobile/src/features/markets/hooks/useLivePrices.ts`

**Step 1: Update WebSocket client**

```typescript
// apps/mobile/src/lib/ws/client.ts
const WS_URL = process.env.EXPO_PUBLIC_WS_URL ?? 'ws://localhost:3000'

export function createPriceSocket(onMessage: (data: PriceUpdate) => void) {
  const ws = new WebSocket(WS_URL)
  ws.onmessage = (e) => onMessage(JSON.parse(e.data))
  ws.onerror = (e) => console.error('[ws] error', e)
  return ws
}

export interface PriceUpdate {
  ticker: string
  ask: number
  bid: number
  mid: number
  timestamp: string
}
```

**Step 2: Write `useLivePrices` hook**

```typescript
// apps/mobile/src/features/markets/hooks/useLivePrices.ts
import { useEffect, useRef, useState } from 'react'
import { createPriceSocket, PriceUpdate } from '../../../lib/ws/client'

export function useLivePrices() {
  const [prices, setPrices] = useState<Record<string, PriceUpdate>>({})
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    wsRef.current = createPriceSocket((update) => {
      setPrices(prev => ({ ...prev, [update.ticker]: update }))
    })
    return () => wsRef.current?.close()
  }, [])

  return prices
}
```

**Step 3: Commit**

```bash
git add apps/mobile/src/lib/ws/ apps/mobile/src/features/markets/hooks/useLivePrices.ts
git commit -m "feat: websocket live price hook"
```

---

### Task 19: Markets screen

**Files:**
- Modify: `apps/mobile/app/(tabs)/markets.tsx`

**Step 1: Implement markets screen**

Markets screen shows a searchable list of stocks, real-time prices, earnings badges, and a market status indicator. On tap, navigates to `/trade/[ticker]`.

Key elements:
- `OPEN / CLOSED / PRE-MARKET / AFTER-HOURS` status badge at top
- Search input (filters the ticker list)
- For each result: ticker, name, mid price, bid/ask, earnings badge if reporting within 7 days
- Crypto always visible with 24/7 indicator

Full implementation follows the design tokens in `src/design/tokens/` and primitives in `src/components/primitives/`.

**Step 2: Commit after implementing**

```bash
git add apps/mobile/app/(tabs)/markets.tsx
git commit -m "feat: markets screen with live prices and earnings badges"
```

---

### Task 20: Trade flow (TradeScreen → TradeConfirmation → TradeSuccess)

**Files:**
- Modify: `apps/mobile/app/trade/[ticker].tsx`
- Create: `apps/mobile/app/trade/confirmation.tsx`
- Create: `apps/mobile/app/trade/success.tsx`

**Key behaviors:**
- TradeScreen: buy/sell toggle, quantity input, live ask/bid shown, "You buy at the ask" label
- TradeConfirmation: execution price, total cost, market hours warning if applicable, "Fills at next available ask price" disclaimer, "Ask [Agent]" button if agent hired
- On first trade: annotated labels shown once (see FTUE Task 23)
- TradeSuccess: confirmation + Post-first-trade moment card (first time only)
- Submit calls `POST /trades`

**Step 2: Commit after implementing**

```bash
git add apps/mobile/app/trade/
git commit -m "feat: trade flow with bid/ask confirmation and execution disclaimer"
```

---

### Task 21: RecommendationScreen (deep link target)

**Files:**
- Create: `apps/mobile/app/recommendation/[id].tsx`

**Key behaviors:**
- Fetches `GET /recommendations/:id/preview` (no rationale)
- Shows: agent name, ticker, action, quantity, estimated execution price, expiry countdown
- Two buttons: Approve / Reject
- On action: calls `PATCH /recommendations/:id`, then fetches `/rationale` and reveals inline
- If expired: shows "Expired" badge, hides buttons
- Deep link: `https://mockket.app/recommendation/[id]` via Expo Universal Links

**Step 2: Add Universal Links config to `app.json`**

```json
{
  "expo": {
    "ios": {
      "associatedDomains": ["applinks:mockket.app"]
    },
    "android": {
      "intentFilters": [{
        "action": "VIEW",
        "autoVerify": true,
        "data": [{ "scheme": "https", "host": "mockket.app" }],
        "category": ["BROWSABLE", "DEFAULT"]
      }]
    }
  }
}
```

**Step 3: Commit after implementing**

```bash
git add apps/mobile/app/recommendation/ apps/mobile/app.json
git commit -m "feat: recommendation screen with rationale reveal and universal links"
```

---

### Task 22: Agents tab, Agent Profile, Hire Flow

**Files:**
- Modify: `apps/mobile/app/(tabs)/agents.tsx`
- Modify: `apps/mobile/app/agent/[id].tsx`

**Key behaviors:**
- Agents tab: Marketplace (all agents) + Hired section (active hires + pending recommendations)
- AgentProfile: bio, strategy, risk level, track record stats, trade log with rationale, Hire button
- HireFlow: allocate amount (min $1,000, max 50% available cash), mode selection (advisory only in MVP)
- Hired agent detail: current holdings (24h delayed for free, real-time for premium), pause/withdraw options
- Withdraw: confirms liquidation, calls `DELETE /agent-hires/:id`

**Step 2: Commit after implementing**

```bash
git add apps/mobile/app/(tabs)/agents.tsx apps/mobile/app/agent/
git commit -m "feat: agents tab, agent profile, and hire flow"
```

---

### Task 23: FTUE — Mission cards, agent intro, annotated first trade, Day 2

**Files:**
- Create: `apps/mobile/src/features/ftue/useFtue.ts`
- Create: `apps/mobile/src/features/ftue/MissionCards.tsx`

**Key behaviors:**
- `useFtue` hook reads/writes `ftue_progress` via `GET /ftue` and `PATCH /ftue`
- Mission 1 cards shown on Home until all 3 complete (not blocking, just persistent)
- Card 1 complete: after 10s on Marcus profile or scroll
- Card 2 complete: after first trade executes
- Card 3 complete: after first challenge created
- Agent intro: backend cron fires within 2 min of account creation, inserts notification card in feed
- Annotated first trade: TradeConfirmation shows inline labels first time only (read from `ftue_progress.first_trade_annotation_shown`)
- Post-first-trade moment: full-screen card after first trade, links to Marcus's log for that ticker
- Day 2: if user returns next day with no challenge started, card shown at top of Home

**Step 2: Commit after implementing**

```bash
git add apps/mobile/src/features/ftue/
git commit -m "feat: FTUE mission cards, agent intro, annotated first trade, day 2 card"
```

---

### Task 24: Challenges tab, Leaderboard, Recap

**Files:**
- Modify: `apps/mobile/app/(tabs)/challenges.tsx`
- Modify: `apps/mobile/app/challenge/[id].tsx`
- Modify: `apps/mobile/app/recap/[challengeId].tsx`
- Create: `apps/mobile/app/challenge/invite/[token].tsx`

**Key behaviors:**
- Challenges tab: active challenges (with live standing), history, start new challenge flow, leaderboard
- ChallengeInviteScreen: shows challenger name, duration, starting balance, Accept/Decline buttons
- Recap: winner announcement, key trades highlighted, agent in-character reaction, "See what decided this" CTA
- Forfeit: records as loss in history

**Step 2: Commit after implementing**

```bash
git add apps/mobile/app/(tabs)/challenges.tsx apps/mobile/app/challenge/ apps/mobile/app/recap/
git commit -m "feat: challenges tab, leaderboard, recap, and friend invite screen"
```

---

### Task 25: Portfolio screen and Settings

**Files:**
- Modify: `apps/mobile/app/(tabs)/portfolio.tsx`

**Key behaviors:**
- Total P&L, segment breakdown (self vs each agent), holdings list, performance chart
- Standard analytics: win rate, average holding period, best/worst single trade, cash drag
- Reset option (gated by RevenueCat IAP — $0.99 consumable)
- Settings: display name, subscription status, leaderboard toggle, notification prefs, What's New, Delete Account

**Step 2: Commit after implementing**

```bash
git add apps/mobile/app/(tabs)/portfolio.tsx
git commit -m "feat: portfolio screen with analytics and settings"
```

---

## Phase 9: IAP

### Task 26: RevenueCat integration

**Files:**
- Create: `apps/mobile/src/lib/purchases/client.ts`
- Create: `apps/mobile/src/features/premium/usePremium.ts`
- Create: `apps/mobile/src/features/premium/PremiumPaywall.tsx`

**Step 1: Install**

```bash
cd apps/mobile && yarn add react-native-purchases
```

**Step 2: Write `apps/mobile/src/lib/purchases/client.ts`**

```typescript
import Purchases, { LOG_LEVEL } from 'react-native-purchases'
import { Platform } from 'react-native'

const API_KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY!,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY!,
}

export function initPurchases() {
  Purchases.setLogLevel(LOG_LEVEL.ERROR)
  Purchases.configure({ apiKey: Platform.OS === 'ios' ? API_KEYS.ios : API_KEYS.android })
}

export async function purchasePremium(packageId: 'monthly' | 'annual') {
  const offerings = await Purchases.getOfferings()
  const pkg = offerings.current?.availablePackages.find(p => p.identifier === packageId)
  if (!pkg) throw new Error('Package not found')
  return Purchases.purchasePackage(pkg)
}

export async function purchaseReset() {
  const offerings = await Purchases.getOfferings()
  const pkg = offerings.all['iap']?.availablePackages.find(p => p.identifier === 'reset')
  if (!pkg) throw new Error('Reset package not found')
  return Purchases.purchasePackage(pkg)
}
```

**Step 3: Backend webhook handler**

Create `packages/api/src/routes/webhooks.ts`:

```typescript
import { Router } from 'express'
import { db } from '../db/client'

export const webhooksRouter = Router()

// RevenueCat webhook — update premium status
webhooksRouter.post('/revenuecat', async (req, res) => {
  const { event } = req.body
  if (!event) return res.status(400).end()

  const userId = event.app_user_id
  const isPremium = ['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE'].includes(event.type)
  const isExpired = ['EXPIRATION', 'CANCELLATION'].includes(event.type)

  if (isPremium) {
    await db.query(`UPDATE users SET is_premium = TRUE WHERE id = $1`, [userId])
  } else if (isExpired) {
    await db.query(`UPDATE users SET is_premium = FALSE WHERE id = $1`, [userId])
  }

  res.status(200).end()
})
```

**Step 4: Commit**

```bash
git add apps/mobile/src/lib/purchases/ apps/mobile/src/features/premium/ packages/api/src/routes/webhooks.ts
git commit -m "feat: revenuecat IAP integration with premium webhook handler"
```

---

## Phase 10: Morning Briefs and Agent Reactions

### Task 27: Morning brief cron

**Files:**
- Create: `packages/api/src/cron/morning-briefs.ts`

```typescript
import cron from 'node-cron'
import { db } from '../db/client'
import { sendPushToUser } from '../lib/fcm'
import { marcusBullChen, priyaSharma } from '@mockket/agents'

const BRIEFS: Record<string, string[]> = {
  'marcus-bull-chen': [
    'Volume pre-market on $NVDA. Watching the open.',
    'Momentum setting up nicely. Ready for the bell.',
    'Aggressive session incoming. Buckle up.',
  ],
  'priya-sharma': [
    'Nothing new to do today. Patience is the position.',
    'Earnings season continues. Staying disciplined.',
    'Markets open in 15. I\'ll be watching, not rushing.',
  ],
}

async function sendMorningBriefs() {
  const { rows: hires } = await db.query(
    `SELECT ah.user_id, ah.agent_id, np.morning_briefs
     FROM agent_hires ah
     JOIN notification_prefs np ON np.user_id = ah.user_id
     WHERE ah.is_active = TRUE AND ah.is_paused = FALSE
       AND np.morning_briefs = TRUE`
  )

  for (const hire of hires) {
    const briefs = BRIEFS[hire.agent_id]
    if (!briefs) continue
    const brief = briefs[Math.floor(Math.random() * briefs.length)]
    const agentName = hire.agent_id === 'marcus-bull-chen' ? 'Marcus' : 'Priya'

    await sendPushToUser(hire.user_id, `${agentName} — market open`, brief, undefined, db)
  }
}

// 9:15am ET weekdays
export function startMorningBriefCron() {
  cron.schedule('15 9 * * 1-5', sendMorningBriefs, { timezone: 'America/New_York' })
}
```

**Step 2: Commit**

```bash
git add packages/api/src/cron/morning-briefs.ts
git commit -m "feat: morning brief push notifications at 9:15am ET"
```

---

### Task 28: Agent reaction system

**Files:**
- Create: `packages/api/src/routes/agent-hires.ts` (partial — add reaction trigger)

When a user executes a trade:
1. Check if the trade is >3% of portfolio value or touches a ticker any hired agent holds/traded recently
2. If yes, and agent hasn't reacted today, send push notification with agent's in-character reaction

Add to the `POST /trades` handler after `executeTrade()`:

```typescript
// Check agent reaction triggers
const { rows: hires } = await db.query(
  `SELECT ah.*, u.portfolio_cash FROM agent_hires ah
   JOIN users u ON u.id = ah.user_id
   WHERE ah.user_id = $1 AND ah.is_active = TRUE AND ah.is_paused = FALSE`,
  [userId]
)

const tradeValue = quantity * price
for (const hire of hires) {
  const portfolioValue = Number(hire.portfolio_cash)
  const isBigTrade = tradeValue / portfolioValue > 0.03

  // Check ticker overlap
  const { rows: overlap } = await db.query(
    `SELECT id FROM trades WHERE agent_id = $1 AND ticker = $2
     AND executed_at > NOW() - INTERVAL '7 days' LIMIT 1`,
    [hire.agent_id, ticker]
  )
  const hasOverlap = overlap.length > 0

  if (!isBigTrade && !hasOverlap) continue

  // Check: has agent already reacted today?
  // (Simplified: check notification log — for now just send)
  const agent = hire.agent_id === 'marcus-bull-chen' ? marcusBullChen : priyaSharma
  const userTrade = { ticker, action, quantity, priceAtExecution: price }
  const reaction = agent.react(userTrade as any)

  await sendPushToUser(userId, agent.shortName, reaction, undefined, db)
}
```

**Step 3: Commit**

```bash
git add packages/api/src/routes/
git commit -m "feat: agent reaction system on big trades and ticker overlap"
```

---

## Phase 11: App Version Config

### Task 29: App version config endpoint

**Files:**
- Create: `packages/api/src/routes/config.ts`

```typescript
import { Router } from 'express'
import { db } from '../db/client'

export const configRouter = Router()

configRouter.get('/app-version', async (req, res) => {
  const platform = req.query.platform as string // 'ios' | 'android'
  const { rows } = await db.query(
    `SELECT version, minimum_version, update_mode FROM app_versions
     WHERE platform = $1 OR platform = 'both'
     ORDER BY created_at DESC LIMIT 1`,
    [platform]
  )

  if (!rows[0]) return res.json({ minimumVersion: '1.0.0', latestVersion: '1.0.0', updateMode: null })

  res.json({
    minimumVersion: rows[0].minimum_version,
    latestVersion: rows[0].version,
    updateMode: rows[0].update_mode,
  })
})

// GET /config/changelog?version=1.2.0&platform=ios
configRouter.get('/changelog', async (req, res) => {
  const { version } = req.query
  const { rows } = await db.query(
    `SELECT ce.type, ce.text, ce.sort_order
     FROM changelog_entries ce
     JOIN app_versions av ON av.id = ce.app_version_id
     WHERE av.version = $1
     ORDER BY ce.sort_order`,
    [version]
  )
  res.json(rows)
})
```

**Step 2: Commit**

```bash
git add packages/api/src/routes/config.ts
git commit -m "feat: app version config and changelog endpoints"
```

---

## Phase 12: Users Route and FTUE Backend

### Task 30: Users and FTUE routes

**Files:**
- Create: `packages/api/src/routes/users.ts`

```typescript
import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { db } from '../db/client'

export const usersRouter = Router()

// POST /users — create user profile after Supabase signup
usersRouter.post('/', requireAuth, async (req, res) => {
  const userId = res.locals.userId
  const { email, displayName } = req.body

  await db.query(
    `INSERT INTO users (id, email, display_name) VALUES ($1, $2, $3)
     ON CONFLICT (id) DO NOTHING`,
    [userId, email, displayName]
  )

  // Initialize FTUE progress
  await db.query(
    `INSERT INTO ftue_progress (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [userId]
  )

  // Initialize notification prefs
  await db.query(
    `INSERT INTO notification_prefs (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [userId]
  )

  res.json({ ok: true })
})

// GET /users/me — current user profile
usersRouter.get('/me', requireAuth, async (_req, res) => {
  const userId = res.locals.userId
  const { rows } = await db.query(
    `SELECT id, email, display_name, is_premium, portfolio_cash, reset_count, leaderboard_opt_in
     FROM users WHERE id = $1`,
    [userId]
  )
  res.json(rows[0])
})

// GET /users/ftue — FTUE progress
usersRouter.get('/ftue', requireAuth, async (_req, res) => {
  const userId = res.locals.userId
  const { rows } = await db.query(
    `SELECT * FROM ftue_progress WHERE user_id = $1`,
    [userId]
  )
  res.json(rows[0] ?? {})
})

// PATCH /users/ftue — update FTUE progress
usersRouter.patch('/ftue', requireAuth, async (req, res) => {
  const userId = res.locals.userId
  const fields = req.body

  const setClauses = Object.keys(fields)
    .map((k, i) => `${k} = $${i + 2}`)
    .join(', ')

  await db.query(
    `UPDATE ftue_progress SET ${setClauses} WHERE user_id = $1`,
    [userId, ...Object.values(fields)]
  )

  res.json({ ok: true })
})

// PATCH /users/me — update display name, leaderboard opt-in
usersRouter.patch('/me', requireAuth, async (req, res) => {
  const userId = res.locals.userId
  const { displayName, leaderboardOptIn } = req.body

  await db.query(
    `UPDATE users SET
       display_name = COALESCE($1, display_name),
       leaderboard_opt_in = COALESCE($2, leaderboard_opt_in),
       updated_at = NOW()
     WHERE id = $3`,
    [displayName ?? null, leaderboardOptIn ?? null, userId]
  )

  res.json({ ok: true })
})

// POST /users/fcm-token — register device token
usersRouter.post('/fcm-token', requireAuth, async (req, res) => {
  const userId = res.locals.userId
  const { token, platform } = req.body

  await db.query(
    `INSERT INTO fcm_tokens (user_id, token, platform)
     VALUES ($1, $2, $3) ON CONFLICT (token) DO NOTHING`,
    [userId, token, platform]
  )

  res.json({ ok: true })
})
```

**Step 2: Register all remaining routes in `index.ts`**

```typescript
import { usersRouter } from './routes/users'
import { configRouter } from './routes/config'
import { webhooksRouter } from './routes/webhooks'
import { agentHiresRouter } from './routes/agent-hires'

app.use('/users', usersRouter)
app.use('/config', configRouter)
app.use('/webhooks', webhooksRouter)

// Start crons
import { startMarketDataCron } from './cron/sync-market-data'
import { startAgentCrons } from './cron/agent-rebalance'
import { startRecommendationCron } from './cron/generate-recommendations'
import { startMorningBriefCron } from './cron/morning-briefs'
import { startAlpacaStream } from './ws/alpaca-stream'
import { startWsServer } from './ws/server'
import http from 'http'

const server = http.createServer(app)
startWsServer(server)
startAlpacaStream(['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'TSLA', 'META', 'AMZN', 'JPM'])
startMarketDataCron()
startAgentCrons()
startRecommendationCron()
startMorningBriefCron()

server.listen(PORT, () => console.log(`Mockket API running on port ${PORT}`))
```

**Step 3: Commit**

```bash
git add packages/api/src/routes/users.ts packages/api/src/index.ts
git commit -m "feat: users, ftue, and fcm token routes; wire up all crons and ws server"
```

---

## Final Checklist

Before marking MVP complete, verify each item from the PRD checklist:

**Core trading**
- [ ] Alpaca price fetch returns bid/ask for all supported tickers
- [ ] WebSocket broadcasts price updates to connected clients
- [ ] Trade confirmation shows bid/ask with correct labels
- [ ] Buy executes at ask, sell executes at bid
- [ ] Market status indicator visible on Markets screen
- [ ] PDT warning triggers at 2+ day trades in 5-day window
- [ ] Dividend credits run on ex-dividend date
- [ ] Stock split adjustments run when detected

**Portfolio & agents**
- [ ] Virtual ledger math is correct (buy deducts cash, sell returns cash)
- [ ] Marcus and Priya rebalance() runs on schedule without errors
- [ ] Advisory recommendation flow: rationale not returned before action
- [ ] Agent trade log shows all trades with rationale

**Challenges & social**
- [ ] Challenge creation deducts cash from main portfolio
- [ ] Friend invite link resolves and allows acceptance
- [ ] Leaderboard returns top 50 opt-in users
- [ ] Recap screen shows after challenge completes

**FTUE**
- [ ] Mission 1 cards appear on Home and dismiss when complete
- [ ] Marcus intro message fires within 2 min of signup
- [ ] First trade confirmation shows annotated labels once
- [ ] Post-first-trade moment card appears after first trade
- [ ] Day 2 card appears if no challenge started by next session

**Infrastructure**
- [ ] Supabase auth token attached to all API requests
- [ ] RevenueCat reset purchase updates `portfolio_cash` to 100000
- [ ] Premium webhook sets `is_premium = true` on subscription purchase
- [ ] Universal Links route `/recommendation/:id` and `/challenge/:token` to correct screens
- [ ] FCM push notifications delivered for recommendations and agent reactions
