# Fix All Issues — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all 24 identified issues across the Mockket backend and mobile app, including 3 critical bugs, 7 high-priority bugs, missing MVP features, and medium/low polish items.

**Architecture:** All backend fixes are in `packages/api/src/`. All mobile fixes are in `apps/mobile/`. Database schema changes are added via new migration files in `packages/api/src/db/`. Tasks within each phase are independent and can be executed in parallel.

**Tech Stack:** Node.js/Express, TypeScript, PostgreSQL (pg), Redis, WebSocket (ws), React Native (Expo Router), Firebase Admin SDK, Supabase Auth, RevenueCat.

---

## Phase 1: Critical Fixes

---

### Task 1: Migrate FCM to HTTP v1 API

The legacy `fcm.googleapis.com/fcm/send` endpoint was shut down June 2024. All push notifications are silently failing.

**Files:**
- Modify: `packages/api/src/lib/fcm.ts`
- Modify: `packages/api/src/index.ts` (env var reference)

**Step 1: Install Firebase Admin SDK**

```bash
cd packages/api && npm install firebase-admin
```

**Step 2: Replace fcm.ts entirely**

```typescript
// packages/api/src/lib/fcm.ts
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'
import { db } from '../db/client'

// Initialize once
if (getApps().length === 0) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)
  initializeApp({ credential: cert(serviceAccount) })
}

export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  try {
    await getMessaging().send({
      token,
      notification: { title, body },
      data,
    })
  } catch (err) {
    console.error(`[fcm] Failed to send to token ${token.slice(0, 8)}...:`, err)
  }
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  const { rows } = await db.query(
    `SELECT token FROM fcm_tokens WHERE user_id = $1`,
    [userId]
  )
  await Promise.allSettled(rows.map((r: any) => sendPushNotification(r.token, title, body, data)))
}
```

Note: `sendPushToUser` no longer accepts `db` as a parameter (it imports directly). All callers passing `db` must be updated.

**Step 3: Update all callers to remove the `db` argument**

Search for all `sendPushToUser` calls:

```bash
cd packages/api && grep -rn "sendPushToUser" src/
```

In each file found, remove the trailing `db` argument from every `sendPushToUser(...)` call. The function signature no longer accepts it.

**Step 4: Update env var — add FIREBASE_SERVICE_ACCOUNT to docs**

In `SETUP.md` or `.env.example`, replace `FCM_SERVER_KEY` with:
```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}  # full JSON, single line
```

**Step 5: Verify TypeScript compiles**

```bash
cd packages/api && npx tsc --noEmit
```
Expected: 0 errors.

**Step 6: Commit**

```bash
git add packages/api/src/lib/fcm.ts packages/api/package.json packages/api/package-lock.json
git commit -m "fix: migrate FCM to HTTP v1 API via firebase-admin SDK"
```

---

### Task 2: Add IAP Gate to Portfolio Reset

`POST /users/portfolio/reset` executes with no purchase verification.

**Files:**
- Modify: `packages/api/src/routes/users.ts:169-214`

**Context:** The RevenueCat webhook at `routes/webhooks.ts` already sets `is_premium = TRUE` on the user record when a purchase is made. The reset endpoint should verify `is_premium = TRUE` before proceeding. For a one-time consumable purchase, RevenueCat should be configured to grant a `portfolio_reset` entitlement; alternatively, check `is_premium` as a proxy until a dedicated entitlement is wired up.

**Step 1: Add the gate check at the top of the reset handler**

In `packages/api/src/routes/users.ts`, find the line:
```typescript
usersRouter.post('/portfolio/reset', requireAuth, async (_req, res) => {
  const userId = res.locals.userId
  const client = await db.connect()
```

Replace with:
```typescript
usersRouter.post('/portfolio/reset', requireAuth, async (_req, res) => {
  const userId = res.locals.userId

  // IAP gate: user must have purchased a reset via RevenueCat
  const { rows: userRows } = await db.query(
    `SELECT is_premium FROM users WHERE id = $1`,
    [userId]
  )
  if (!userRows[0]?.is_premium) {
    return res.status(402).json({ error: 'Purchase required to reset portfolio' })
  }

  const client = await db.connect()
```

**Step 2: Verify TypeScript compiles**

```bash
cd packages/api && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add packages/api/src/routes/users.ts
git commit -m "fix: gate portfolio reset behind IAP (is_premium check)"
```

---

### Task 3: Enforce Market Hours on Trades + Fix Weekend Detection

Trades execute 24/7 against stale quotes. `getMarketStatus()` weekend detection is also broken.

**Files:**
- Modify: `packages/api/src/lib/alpaca.ts`
- Modify: `packages/api/src/routes/trades.ts`

**Step 1: Fix `getMarketStatus()` weekend detection**

The current arithmetic approximation fails over weekends. Replace with clock-time detection using the Alpaca clock's `next_open` date to determine the day gap.

Replace the body of `getMarketStatus` in `packages/api/src/lib/alpaca.ts`:

```typescript
export async function getMarketStatus(): Promise<'open' | 'closed' | 'pre-market' | 'after-hours'> {
  const { data } = await client.get('/v1/clock')
  if (data.is_open) return 'open'

  // Get current time in ET
  const nowET = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const hours = nowET.getHours()
  const minutes = nowET.getMinutes()
  const timeDecimal = hours + minutes / 60

  // Check if today is a trading day by seeing if next_open is today or tomorrow
  const nextOpen = new Date(data.next_open)
  const nextOpenET = new Date(nextOpen.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const todayET = new Date(nowET)
  todayET.setHours(0, 0, 0, 0)
  const nextOpenDay = new Date(nextOpenET)
  nextOpenDay.setHours(0, 0, 0, 0)

  const isTradingDay = nextOpenDay.getTime() === todayET.getTime()

  if (!isTradingDay) return 'closed' // weekend or holiday

  // Pre-market: 4:00am–9:30am ET
  if (timeDecimal >= 4 && timeDecimal < 9.5) return 'pre-market'

  // After-hours: 4:00pm–8:00pm ET
  if (timeDecimal >= 16 && timeDecimal < 20) return 'after-hours'

  return 'closed'
}
```

**Step 2: Call `getMarketStatus()` in the trades route**

In `packages/api/src/routes/trades.ts`, add the import at top:
```typescript
import { getQuote, getMarketStatus } from '../lib/alpaca'
```

(Replace the existing `import { getQuote } from '../lib/alpaca'` line.)

After the input validation block (after line 24), before the `getQuote` call, insert:

```typescript
  // Market hours enforcement
  let marketStatus: string
  try {
    marketStatus = await getMarketStatus()
  } catch {
    marketStatus = 'open' // fail open: don't block trades if clock check fails
  }
  if (marketStatus === 'closed') {
    return res.status(422).json({ error: 'Market is closed. Trading is only available during market hours.' })
  }
  if (marketStatus === 'pre-market' || marketStatus === 'after-hours') {
    return res.status(422).json({ error: `Market is currently in ${marketStatus}. Extended hours trading is not supported.` })
  }
```

**Step 3: Verify TypeScript compiles**

```bash
cd packages/api && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add packages/api/src/lib/alpaca.ts packages/api/src/routes/trades.ts
git commit -m "fix: enforce market hours on trades and fix weekend status detection"
```

---

## Phase 2: High-Priority Fixes

---

### Task 4: Wrap `executeTrade` in try/catch in trades route

Currently `POST /trades` has no error handler around `executeTrade`. If it throws (e.g. "Insufficient cash"), PDT tracking and agent reactions still attempt to run.

**Files:**
- Modify: `packages/api/src/routes/trades.ts`

**Step 1: Wrap executeTrade and move post-trade logic inside success branch**

Replace the section from `await executeTrade(...)` through `res.json(...)` and the agent reaction block. The current structure is:

```typescript
  await executeTrade({ userId, ticker, action, quantity, price, challengeId, agentHireId })

  // PDT tracking...
  // ...
  res.json({ ok: true, price, executedAt: new Date().toISOString(), dayTradeCount })

  // Agent reactions (non-blocking void)
  void (async () => { ... })()
```

Replace with:

```typescript
  try {
    await executeTrade({ userId, ticker, action, quantity, price, challengeId, agentHireId })
  } catch (err: any) {
    if (err.message === 'Insufficient cash') {
      return res.status(400).json({ error: 'Insufficient cash to execute this trade' })
    }
    if (err.message === 'Insufficient holding quantity') {
      return res.status(400).json({ error: 'Insufficient shares to sell' })
    }
    throw err
  }

  // PDT day trade tracking — only runs if trade succeeded
  const oppositeAction = action === 'buy' ? 'sell' : 'buy'
  const { rows: oppRows } = await db.query(
    `SELECT id FROM trades
     WHERE user_id = $1 AND ticker = $2 AND action = $3
     AND DATE(executed_at AT TIME ZONE 'America/New_York') = (NOW() AT TIME ZONE 'America/New_York')::date
     LIMIT 1`,
    [userId, ticker, oppositeAction]
  )
  if (oppRows.length > 0) {
    const { rows: existingDt } = await db.query(
      `SELECT id FROM day_trades
       WHERE user_id = $1 AND ticker = $2
       AND DATE(traded_at AT TIME ZONE 'America/New_York') = (NOW() AT TIME ZONE 'America/New_York')::date
       LIMIT 1`,
      [userId, ticker]
    )
    if (existingDt.length === 0) {
      await db.query(
        `INSERT INTO day_trades (user_id, ticker) VALUES ($1, $2)`,
        [userId, ticker]
      )
    }
  }

  const { rows: dtRows } = await db.query(
    `SELECT COUNT(*) FROM day_trades
     WHERE user_id = $1 AND traded_at > NOW() - INTERVAL '7 days'`,
    [userId]
  )
  const dayTradeCount = Number(dtRows[0].count)

  res.json({ ok: true, price, executedAt: new Date().toISOString(), dayTradeCount })

  // Agent reactions — run after responding (non-blocking)
  void (async () => {
    // ... keep existing agent reaction block unchanged ...
  })()
```

**Step 2: Verify TypeScript compiles**

```bash
cd packages/api && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add packages/api/src/routes/trades.ts
git commit -m "fix: wrap executeTrade in try/catch, guard PDT and reactions on success only"
```

---

### Task 5: Add per-client ticker subscriptions to WebSocket server

Currently all price ticks are broadcast to every connected client regardless of what they subscribed to.

**Files:**
- Modify: `packages/api/src/ws/server.ts`

**Step 1: Replace the WS server with subscription-aware version**

```typescript
// packages/api/src/ws/server.ts
import { Server as HttpServer } from 'http'
import WebSocket, { WebSocketServer } from 'ws'
import { createClient } from '@supabase/supabase-js'
import { redis } from '../lib/redis'
import { addTicker } from './alpaca-stream'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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
              // Ensure Alpaca stream is subscribed to this ticker
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
```

**Step 2: Export `addTicker` from alpaca-stream.ts**

In `packages/api/src/ws/alpaca-stream.ts`, add after `startAlpacaStream`:

```typescript
// Dynamically add a ticker to the live subscription
export function addTicker(ticker: string) {
  if (activeTickers.includes(ticker)) return
  activeTickers.push(ticker)
  if (alpacaWs?.readyState === WebSocket.OPEN) {
    alpacaWs.send(JSON.stringify({ action: 'subscribe', quotes: [ticker] }))
  }
}
```

Also add the `WebSocket` import if not already present:
```typescript
import WebSocket from 'ws'
```

**Step 3: Verify TypeScript compiles**

```bash
cd packages/api && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add packages/api/src/ws/server.ts packages/api/src/ws/alpaca-stream.ts
git commit -m "fix: add per-client ticker subscriptions to WS server, export addTicker"
```

---

### Task 6: Fix recommendations cron to use agent.rebalance()

Currently generates only BUY actions on random tickers. Should derive recommendations from the actual agent rebalance logic.

**Files:**
- Modify: `packages/api/src/cron/generate-recommendations.ts`

**Step 1: Rewrite `generateRecommendations` to call `agent.rebalance()`**

```typescript
// packages/api/src/cron/generate-recommendations.ts
import cron from 'node-cron'
import { db } from '../db/client'
import { getQuotes } from '../lib/alpaca'
import { marcusBullChen, priyaSharma } from '@mockket/agents'
import { sendPushToUser } from '../lib/fcm'
import type { AgentModule } from '@mockket/agents'

const AGENTS: AgentModule[] = [marcusBullChen, priyaSharma]

async function generateRecommendations(agentId: string) {
  const agent = AGENTS.find(a => a.id === agentId)
  if (!agent) return

  const { rows: hires } = await db.query(
    `SELECT ah.*, u.portfolio_cash FROM agent_hires ah
     JOIN users u ON u.id = ah.user_id
     WHERE ah.agent_id = $1 AND ah.mode = 'advisory'
       AND ah.is_active = TRUE AND ah.is_paused = FALSE`,
    [agentId]
  )

  for (const hire of hires) {
    try {
      // Check: has this agent already sent a recommendation today?
      const { rows: existing } = await db.query(
        `SELECT id FROM agent_recommendations
         WHERE user_id = $1 AND agent_id = $2
           AND created_at > NOW() - INTERVAL '24 hours'
           AND status = 'pending'`,
        [hire.user_id, agentId]
      )
      if (existing.length > 0) continue

      // Get agent's current holdings for this hire
      const { rows: holdingRows } = await db.query(
        `SELECT ticker, quantity, avg_cost FROM holdings
         WHERE user_id = $1 AND agent_hire_id = $2`,
        [hire.user_id, hire.id]
      )

      // Fetch current prices for all held tickers + agent watchlist
      const watchlist = agentId === 'marcus-bull-chen'
        ? ['NVDA', 'TSLA', 'AMD', 'META', 'AMZN']
        : ['JNJ', 'MSFT', 'AAPL', 'KO', 'PG']
      const heldTickers = holdingRows.map((h: any) => h.ticker)
      const allTickers = [...new Set([...heldTickers, ...watchlist])]

      const quotes = await getQuotes(allTickers)
      const priceMap = Object.fromEntries(quotes.map(q => [q.ticker, q.mid]))

      const portfolio = {
        cash: Number(hire.allocated_cash),
        holdings: holdingRows.map((h: any) => ({
          ticker: h.ticker,
          quantity: Number(h.quantity),
          avgCost: Number(h.avg_cost),
          currentPrice: priceMap[h.ticker] ?? 0,
        })),
      }

      // Use agent's rebalance logic to determine trades
      const trades = await agent.rebalance(portfolio, {
        prices: priceMap,
        timestamp: new Date().toISOString(),
      })

      if (trades.length === 0) continue

      // Take the first trade as today's recommendation
      const trade = trades[0]
      const quote = quotes.find(q => q.ticker === trade.ticker)
      if (!quote) continue

      const price = trade.action === 'buy' ? quote.ask : quote.bid
      const quantity = trade.action === 'buy'
        ? Math.max(1, Math.floor(1000 / price)) // ~$1000 position for advisory
        : trade.quantity

      if (quantity < 1) continue

      const rationale = agent.getRationale({
        ...trade,
        userId: hire.user_id,
        priceAtExecution: price,
        quantity,
      })

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

      const { rows } = await db.query(
        `INSERT INTO agent_recommendations
           (user_id, agent_hire_id, agent_id, ticker, action, quantity, rationale, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [hire.user_id, hire.id, agentId, trade.ticker, trade.action, quantity, rationale, expiresAt]
      )

      const recId = rows[0].id
      await sendPushToUser(
        hire.user_id,
        `${agent.shortName} has a recommendation`,
        `${trade.action.toUpperCase()} ${trade.ticker} — tap to review`,
        { url: `https://mockket.app/recommendation/${recId}` },
      )
    } catch (err) {
      console.error(`[recommendations] Failed for hire ${hire.id}:`, err)
    }
  }
}

export function startRecommendationCron() {
  cron.schedule('30 9 * * 1-5', async () => {
    await Promise.allSettled([
      generateRecommendations('marcus-bull-chen'),
      generateRecommendations('priya-sharma'),
    ])
  }, { timezone: 'America/New_York' })
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd packages/api && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add packages/api/src/cron/generate-recommendations.ts
git commit -m "fix: recommendations cron uses agent.rebalance() instead of random tickers"
```

---

### Task 7: Fix agent rebalance to use ask/bid prices for allocation

Agent modules use `marketData.prices[ticker]` (mid) for quantity allocation, but trades execute at ask/bid. Extend `MarketData` to carry ask/bid maps.

**Files:**
- Modify: `packages/agents/src/types.ts`
- Modify: `packages/agents/src/marcus-bull-chen/index.ts`
- Modify: `packages/agents/src/priya-sharma/index.ts`
- Modify: `packages/api/src/cron/agent-rebalance.ts`

**Step 1: Update MarketData type**

In `packages/agents/src/types.ts`, find the `MarketData` interface and update it:

```typescript
export interface MarketData {
  prices: Record<string, number>  // mid price — use for P&L decisions and thresholds
  ask: Record<string, number>     // use for buy quantity allocation
  bid: Record<string, number>     // use for sell P&L calculations
  timestamp: string
}
```

**Step 2: Update marcus-bull-chen to use ask for buy allocation**

In `packages/agents/src/marcus-bull-chen/index.ts`, in the `rebalance` function, find:
```typescript
      const allocation = Math.min(totalValue * 0.10, portfolio.cash)
      if (allocation < 1000) continue
      const quantity = Math.floor(allocation / price)
```

Replace with:
```typescript
      const askPrice = marketData.ask[ticker] ?? price
      const allocation = Math.min(totalValue * 0.10, portfolio.cash)
      if (allocation < 1000) continue
      const quantity = Math.floor(allocation / askPrice)
```

And update `priceAtExecution` in the buy trade to use ask:
```typescript
        priceAtExecution: askPrice,
```

**Step 3: Update priya-sharma similarly**

Open `packages/agents/src/priya-sharma/index.ts` and apply the same pattern — use `marketData.ask[ticker] ?? price` for buy quantity, `marketData.bid[ticker] ?? price` for sell price calculation.

**Step 4: Update agent-rebalance.ts cron to pass ask/bid maps**

In `packages/api/src/cron/agent-rebalance.ts`, replace:
```typescript
      const priceMap = Object.fromEntries(prices.map(p => [p.ticker, p.mid]))
```
with:
```typescript
      const priceMap = Object.fromEntries(prices.map(p => [p.ticker, p.mid]))
      const askMap = Object.fromEntries(prices.map(p => [p.ticker, p.ask]))
      const bidMap = Object.fromEntries(prices.map(p => [p.ticker, p.bid]))
```

And update the `agent.rebalance()` call:
```typescript
      const trades = await agent.rebalance(portfolio, {
        prices: priceMap,
        ask: askMap,
        bid: bidMap,
        timestamp: new Date().toISOString(),
      })
```

**Step 5: Verify TypeScript compiles**

```bash
cd packages/api && npx tsc --noEmit && cd ../../packages/agents && npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add packages/agents/src/types.ts packages/agents/src/marcus-bull-chen/index.ts packages/agents/src/priya-sharma/index.ts packages/api/src/cron/agent-rebalance.ts
git commit -m "fix: agent rebalance uses ask price for buy allocation, bid for sell P&L"
```

---

### Task 8: Fix leaderboard to use market value not cost basis

`challenges.ts` leaderboard computes `SUM(h.quantity * h.avg_cost)` — this is cost basis, not current value.

**Files:**
- Modify: `packages/api/src/routes/challenges.ts`

**Context:** The `holdings` table does not have a `current_price` column. The cleanest solution given the current schema is to read prices from a `current_prices` cache table that the price sync cron maintains. However, since no such table exists yet, we add one and populate it from the sync cron.

**Step 1: Add migration for current_prices table**

Create `packages/api/src/db/migrations/008_current_prices.sql`:

```sql
CREATE TABLE IF NOT EXISTS current_prices (
  ticker TEXT PRIMARY KEY,
  price NUMERIC(18, 6) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Step 2: Populate current_prices in the market data sync cron**

In `packages/api/src/cron/sync-market-data.ts`, add after the imports:

```typescript
import { getQuotes } from '../lib/alpaca'
```

At the end of `syncMarketData()`, before the final `console.log`, add:

```typescript
    // Refresh current prices for all tracked tickers
    try {
      const quotes = await getQuotes(TRACKED_TICKERS)
      for (const q of quotes) {
        await db.query(
          `INSERT INTO current_prices (ticker, price, updated_at) VALUES ($1, $2, NOW())
           ON CONFLICT (ticker) DO UPDATE SET price = $2, updated_at = NOW()`,
          [q.ticker, q.mid]
        )
      }
    } catch (err: any) {
      console.error('[cron] failed to refresh current_prices:', err.message)
    }
```

**Step 3: Update leaderboard query**

In `packages/api/src/routes/challenges.ts`, replace the leaderboard query:

```typescript
  const { rows } = await db.query(
    `SELECT u.display_name,
       u.portfolio_cash + COALESCE(SUM(h.quantity * COALESCE(cp.price, h.avg_cost)), 0) AS total_value,
       ((u.portfolio_cash + COALESCE(SUM(h.quantity * COALESCE(cp.price, h.avg_cost)), 0) - 100000) / 100000 * 100) AS return_pct
     FROM users u
     LEFT JOIN holdings h ON h.user_id = u.id AND h.agent_hire_id IS NULL AND h.challenge_id IS NULL
     LEFT JOIN current_prices cp ON cp.ticker = h.ticker
     WHERE u.leaderboard_opt_in = TRUE
     GROUP BY u.id, u.display_name, u.portfolio_cash
     ORDER BY return_pct DESC
     LIMIT 50`
  )
```

(Falls back to `avg_cost` if no current price available yet.)

**Step 4: Verify TypeScript compiles**

```bash
cd packages/api && npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add packages/api/src/db/migrations/008_current_prices.sql packages/api/src/cron/sync-market-data.ts packages/api/src/routes/challenges.ts
git commit -m "fix: leaderboard uses current market price instead of cost basis"
```

---

### Task 9: Replace Marcus intro setTimeout with scheduled_jobs cron

`setTimeout` in the request handler is lost on server restart.

**Files:**
- Create: `packages/api/src/db/migrations/009_scheduled_jobs.sql`
- Modify: `packages/api/src/routes/users.ts`
- Modify: `packages/api/src/cron/morning-briefs.ts` (or create a new cron file)

**Step 1: Create scheduled_jobs migration**

```sql
-- packages/api/src/db/migrations/009_scheduled_jobs.sql
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  run_at TIMESTAMPTZ NOT NULL,
  ran_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_pending ON scheduled_jobs (run_at)
  WHERE ran_at IS NULL;
```

**Step 2: Update `POST /users` to schedule the intro job instead of setTimeout**

In `packages/api/src/routes/users.ts`, replace the entire `void (async () => { ... })()` block (lines 41-58) with:

```typescript
  // Schedule Marcus intro push 2 minutes after account creation
  await db.query(
    `INSERT INTO scheduled_jobs (job_type, payload, run_at)
     VALUES ('marcus_intro', $1, NOW() + INTERVAL '2 minutes')`,
    [JSON.stringify({ userId })]
  )
```

**Step 3: Add a cron to process scheduled_jobs**

In `packages/api/src/cron/morning-briefs.ts`, add at the end of the file (after `startMorningBriefCron`):

```typescript
export async function processScheduledJobs() {
  const { rows } = await db.query(
    `UPDATE scheduled_jobs SET ran_at = NOW()
     WHERE ran_at IS NULL AND run_at <= NOW()
     RETURNING *`
  )

  for (const job of rows) {
    try {
      if (job.job_type === 'marcus_intro') {
        const { userId } = job.payload as { userId: string }

        // Check if already sent (idempotency guard)
        const { rows: ftue } = await db.query(
          `SELECT agent_intro_sent FROM ftue_progress WHERE user_id = $1`,
          [userId]
        )
        if (ftue[0]?.agent_intro_sent) continue

        await sendPushToUser(
          userId,
          'Marcus Bull Chen',
          "Hey — I've been watching your account. First move matters. Let's get to work.",
        )
        await db.query(
          `UPDATE ftue_progress SET agent_intro_sent = TRUE WHERE user_id = $1`,
          [userId]
        )
      }
    } catch (err) {
      console.error(`[scheduled-jobs] Failed job ${job.id} (${job.job_type}):`, err)
    }
  }
}

export function startScheduledJobsCron() {
  // Run every minute
  cron.schedule('* * * * *', processScheduledJobs)
}
```

Also add the imports at the top of morning-briefs.ts if not present:
```typescript
import { sendPushToUser } from '../lib/fcm'
```

**Step 4: Register the new cron in `packages/api/src/index.ts`**

Find where `startMorningBriefCron()` is called and add:
```typescript
import { startScheduledJobsCron } from './cron/morning-briefs'
// ...
startScheduledJobsCron()
```

**Step 5: Verify TypeScript compiles**

```bash
cd packages/api && npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add packages/api/src/db/migrations/009_scheduled_jobs.sql packages/api/src/routes/users.ts packages/api/src/cron/morning-briefs.ts packages/api/src/index.ts
git commit -m "fix: replace Marcus intro setTimeout with scheduled_jobs cron (restart-safe)"
```

---

### Task 10: Validate challengeId ownership in POST /trades

Any user can pass an arbitrary `challengeId` to route trades against another user's challenge.

**Files:**
- Modify: `packages/api/src/routes/trades.ts`

**Step 1: Add ownership validation after the input validation block**

After the market status check and before `getQuote`, add:

```typescript
  // Validate challengeId ownership and status
  if (challengeId) {
    const { rows: challengeRows } = await db.query(
      `SELECT id FROM challenges
       WHERE id = $1
         AND (user_id = $2 OR opponent_user_id = $2)
         AND status = 'active'`,
      [challengeId, userId]
    )
    if (challengeRows.length === 0) {
      return res.status(403).json({ error: 'Challenge not found or not active' })
    }
  }
```

**Step 2: Verify TypeScript compiles**

```bash
cd packages/api && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add packages/api/src/routes/trades.ts
git commit -m "fix: validate challengeId ownership and active status before executing trade"
```

---

### Task 11: Add challenge cash ledger

Challenge trades currently debit `users.portfolio_cash` instead of the challenge's own balance.

**Files:**
- Create: `packages/api/src/db/migrations/010_challenge_cash.sql`
- Modify: `packages/api/src/lib/ledger.ts`
- Modify: `packages/api/src/routes/challenges.ts`

**Step 1: Add challenge_cash column migration**

```sql
-- packages/api/src/db/migrations/010_challenge_cash.sql
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS challenge_cash NUMERIC(18,2) NOT NULL DEFAULT 0;

-- Backfill: set challenge_cash = starting_balance for existing active/completed challenges
UPDATE challenges SET challenge_cash = starting_balance WHERE challenge_cash = 0;
```

**Step 2: Update `executeTrade` in ledger.ts to use challenge_cash when challengeId is set**

In `packages/api/src/lib/ledger.ts`, replace the buy cash deduction:

```typescript
    if (trade.action === 'buy') {
      const cost = trade.quantity * trade.price

      if (trade.challengeId) {
        // Deduct from challenge cash, not main portfolio
        const { rows } = await client.query(
          `UPDATE challenges SET challenge_cash = challenge_cash - $1
           WHERE id = $2 AND challenge_cash >= $1 RETURNING id`,
          [cost, trade.challengeId]
        )
        if (rows.length === 0) throw new Error('Insufficient cash')
      } else {
        // Deduct from main portfolio
        const { rows } = await client.query(
          `UPDATE users SET portfolio_cash = portfolio_cash - $1, updated_at = NOW()
           WHERE id = $2 AND portfolio_cash >= $1 RETURNING id`,
          [cost, trade.userId]
        )
        if (rows.length === 0) throw new Error('Insufficient cash')
      }
```

Similarly for the sell cash credit:

```typescript
      if (trade.challengeId) {
        await client.query(
          `UPDATE challenges SET challenge_cash = challenge_cash + $1 WHERE id = $2`,
          [proceeds, trade.challengeId]
        )
      } else {
        await client.query(
          `UPDATE users SET portfolio_cash = portfolio_cash + $1, updated_at = NOW()
           WHERE id = $2`,
          [proceeds, trade.userId]
        )
      }
```

**Step 3: Expose challenge_cash in GET /challenges/:id response**

The `SELECT *` in `challenges.ts` already returns all columns including `challenge_cash`, so no change needed once the column exists.

**Step 4: Verify TypeScript compiles**

```bash
cd packages/api && npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add packages/api/src/db/migrations/010_challenge_cash.sql packages/api/src/lib/ledger.ts
git commit -m "fix: challenge trades debit challenge_cash not portfolio_cash"
```

---

## Phase 3: Missing MVP Features

---

### Task 12: Add dividend credit cron

`dividend_events` rows are written but never used to credit user portfolios.

**Files:**
- Create: `packages/api/src/cron/dividend-credits.ts`
- Modify: `packages/api/src/index.ts`

**Step 1: Create dividend credit cron**

```typescript
// packages/api/src/cron/dividend-credits.ts
import cron from 'node-cron'
import { db } from '../db/client'

export async function processDividends() {
  try {
    // Find dividend events with ex_date = today (ET)
    const { rows: events } = await db.query(
      `SELECT ticker, amount_per_share FROM dividend_events
       WHERE ex_date = (NOW() AT TIME ZONE 'America/New_York')::date
         AND credited_at IS NULL`
    )

    if (events.length === 0) return

    for (const event of events) {
      try {
        // Find all holders of this ticker (main portfolio only)
        const { rows: holders } = await db.query(
          `SELECT user_id, quantity FROM holdings
           WHERE ticker = $1
             AND agent_hire_id IS NULL
             AND challenge_id IS NULL
             AND quantity > 0`,
          [event.ticker]
        )

        for (const holder of holders) {
          const credit = Number(holder.quantity) * Number(event.amount_per_share)
          if (credit <= 0) continue

          await db.query(
            `UPDATE users SET portfolio_cash = portfolio_cash + $1, updated_at = NOW()
             WHERE id = $2`,
            [credit, holder.user_id]
          )
        }

        // Mark event as credited
        await db.query(
          `UPDATE dividend_events SET credited_at = NOW()
           WHERE ticker = $1 AND ex_date = (NOW() AT TIME ZONE 'America/New_York')::date`,
          [event.ticker]
        )

        console.log(`[dividends] credited ${event.ticker} $${event.amount_per_share}/share to ${holders.length} holders`)
      } catch (err: any) {
        console.error(`[dividends] failed for ${event.ticker}:`, err.message)
      }
    }
  } catch (err: any) {
    console.error('[dividends] processDividends failed:', err.message)
  }
}

// Run daily at 6pm ET (after market close, when dividends settle)
export function startDividendCron() {
  cron.schedule('0 18 * * 1-5', processDividends, { timezone: 'America/New_York' })
}
```

**Step 2: Add `credited_at` column to dividend_events**

Create `packages/api/src/db/migrations/011_dividend_credited_at.sql`:

```sql
ALTER TABLE dividend_events ADD COLUMN IF NOT EXISTS credited_at TIMESTAMPTZ;
```

**Step 3: Register cron in index.ts**

```typescript
import { startDividendCron } from './cron/dividend-credits'
// ...
startDividendCron()
```

**Step 4: Verify TypeScript compiles**

```bash
cd packages/api && npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add packages/api/src/cron/dividend-credits.ts packages/api/src/db/migrations/011_dividend_credited_at.sql packages/api/src/index.ts
git commit -m "feat: add dividend credit cron — credits portfolio_cash on ex-dividend date"
```

---

### Task 13: Add stock split position adjustment

No stock split handling exists at all.

**Files:**
- Create: `packages/api/src/db/migrations/012_split_events.sql`
- Modify: `packages/api/src/lib/polygon.ts`
- Modify: `packages/api/src/cron/sync-market-data.ts`
- Create: `packages/api/src/cron/split-adjustments.ts`
- Modify: `packages/api/src/index.ts`

**Step 1: Create split_events migration**

```sql
-- packages/api/src/db/migrations/012_split_events.sql
CREATE TABLE IF NOT EXISTS split_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  effective_date DATE NOT NULL,
  ratio NUMERIC(10, 4) NOT NULL,  -- e.g. 4.0 for 4:1 split, 0.5 for 1:2 reverse split
  applied_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ticker, effective_date)
);
```

**Step 2: Add `getSplits` to polygon.ts**

In `packages/api/src/lib/polygon.ts`, add:

```typescript
export interface SplitEvent {
  ticker: string
  effectiveDate: string  // ISO date string
  ratio: number          // new_shares / old_shares
}

export async function getSplits(tickers: string[]): Promise<SplitEvent[]> {
  if (!process.env.POLYGON_API_KEY) return []
  try {
    const results: SplitEvent[] = []
    for (const ticker of tickers) {
      const { data } = await axios.get(
        `https://api.polygon.io/v3/reference/splits?ticker=${ticker}&limit=10`,
        { headers: { Authorization: `Bearer ${process.env.POLYGON_API_KEY}` } }
      )
      for (const s of (data.results ?? [])) {
        results.push({
          ticker: s.ticker,
          effectiveDate: s.execution_date,
          ratio: s.split_to / s.split_from,
        })
      }
    }
    return results
  } catch (err: any) {
    console.error('[polygon] getSplits failed:', err.message)
    return []
  }
}
```

**Step 3: Sync split events in sync-market-data.ts**

In `packages/api/src/cron/sync-market-data.ts`, add `getSplits` to the import:

```typescript
import { getDividends, getEarnings, getSplits } from '../lib/polygon'
```

In `syncMarketData()`, add after the earnings loop:

```typescript
    const splits = await getSplits(TRACKED_TICKERS)
    for (const s of splits) {
      try {
        await db.query(
          `INSERT INTO split_events (ticker, effective_date, ratio)
           VALUES ($1, $2, $3)
           ON CONFLICT (ticker, effective_date) DO NOTHING`,
          [s.ticker, s.effectiveDate, s.ratio]
        )
      } catch (err: any) {
        console.error(`[cron] failed to upsert split for ${s.ticker}:`, err.message)
      }
    }
```

**Step 4: Create split adjustment cron**

```typescript
// packages/api/src/cron/split-adjustments.ts
import cron from 'node-cron'
import { db } from '../db/client'

export async function applySplitAdjustments() {
  try {
    const { rows: splits } = await db.query(
      `SELECT id, ticker, ratio FROM split_events
       WHERE effective_date = (NOW() AT TIME ZONE 'America/New_York')::date
         AND applied_at IS NULL`
    )

    for (const split of splits) {
      const client = await db.connect()
      try {
        await client.query('BEGIN')

        // Adjust all holdings for this ticker
        // New quantity = old * ratio, new avg_cost = old / ratio
        await client.query(
          `UPDATE holdings
           SET quantity = FLOOR(quantity * $1),
               avg_cost = avg_cost / $1
           WHERE ticker = $2 AND quantity > 0`,
          [split.ratio, split.ticker]
        )

        // Remove zero-quantity holdings created by floor rounding
        await client.query(
          `DELETE FROM holdings WHERE ticker = $1 AND quantity = 0`,
          [split.ticker]
        )

        await client.query(
          `UPDATE split_events SET applied_at = NOW() WHERE id = $1`,
          [split.id]
        )

        await client.query('COMMIT')
        console.log(`[splits] applied ${split.ticker} split (ratio ${split.ratio})`)
      } catch (err) {
        await client.query('ROLLBACK')
        console.error(`[splits] failed for ${split.ticker}:`, err)
      } finally {
        client.release()
      }
    }
  } catch (err: any) {
    console.error('[splits] applySplitAdjustments failed:', err.message)
  }
}

// Run at 9:00am ET on trading days (before market open)
export function startSplitCron() {
  cron.schedule('0 9 * * 1-5', applySplitAdjustments, { timezone: 'America/New_York' })
}
```

**Step 5: Register in index.ts**

```typescript
import { startSplitCron } from './cron/split-adjustments'
// ...
startSplitCron()
```

**Step 6: Verify TypeScript compiles**

```bash
cd packages/api && npx tsc --noEmit
```

**Step 7: Commit**

```bash
git add packages/api/src/db/migrations/012_split_events.sql packages/api/src/lib/polygon.ts packages/api/src/cron/sync-market-data.ts packages/api/src/cron/split-adjustments.ts packages/api/src/index.ts
git commit -m "feat: stock split detection and position adjustment cron"
```

---

### Task 14: Add earnings calendar API endpoint

Earnings data is synced to `earnings_calendar` but never exposed via API or shown in UI.

**Files:**
- Modify: `packages/api/src/routes/config.ts`
- Modify: `apps/mobile/src/features/markets/hooks/usePrices.ts` (or create a hook)

**Step 1: Add earnings endpoint to config route**

In `packages/api/src/routes/config.ts`, add:

```typescript
// GET /config/earnings?tickers=AAPL,MSFT
configRouter.get('/earnings', async (req, res) => {
  const tickersParam = req.query.tickers as string | undefined
  if (!tickersParam) return res.status(400).json({ error: 'tickers query param required' })

  const tickers = tickersParam.split(',').map(t => t.trim().toUpperCase()).filter(Boolean)
  if (tickers.length === 0 || tickers.length > 50) {
    return res.status(400).json({ error: 'Provide 1–50 tickers' })
  }

  const { rows } = await db.query(
    `SELECT ticker, report_date
     FROM earnings_calendar
     WHERE ticker = ANY($1)
       AND report_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
     ORDER BY report_date ASC`,
    [tickers]
  )

  // Return as { AAPL: '2026-02-25', ... }
  const result: Record<string, string> = {}
  for (const row of rows) {
    result[row.ticker] = row.report_date
  }
  res.json(result)
})
```

**Step 2: Create `useEarnings` hook in mobile**

Create `apps/mobile/src/features/markets/hooks/useEarnings.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { queryKeys } from '@/lib/query/keys'

export function useEarnings(tickers: string[]) {
  return useQuery({
    queryKey: queryKeys.earnings(tickers),
    queryFn: async () => {
      if (tickers.length === 0) return {}
      const data = await apiClient.get<Record<string, string>>(
        `/config/earnings?tickers=${tickers.join(',')}`
      )
      return data
    },
    enabled: tickers.length > 0,
    staleTime: 60 * 60 * 1000, // 1 hour
  })
}
```

Add to `apps/mobile/src/lib/query/keys.ts`:
```typescript
earnings: (tickers: string[]) => ['earnings', tickers.sort().join(',')] as const,
```

**Step 3: Verify TypeScript compiles**

```bash
cd packages/api && npx tsc --noEmit
cd apps/mobile && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add packages/api/src/routes/config.ts apps/mobile/src/features/markets/hooks/useEarnings.ts apps/mobile/src/lib/query/keys.ts
git commit -m "feat: earnings calendar API endpoint and useEarnings hook"
```

---

### Task 15: Build out Home screen

The Home tab (`apps/mobile/app/(tabs)/index.tsx`) renders only `<Text>Home</Text>`.

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`
- Modify: `apps/mobile/src/features/ftue/MissionCards.tsx` (verify props interface)

**Step 1: Read MissionCards.tsx to understand its props**

Read `apps/mobile/src/features/ftue/MissionCards.tsx` and `apps/mobile/src/features/ftue/useFtue.ts` to understand the component API.

**Step 2: Build out Home screen**

```typescript
// apps/mobile/app/(tabs)/index.tsx
import { ScrollView, View, StyleSheet } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Text } from '@/components/primitives'
import { tokens } from '@/design/tokens'
import { MissionCards } from '@/features/ftue/MissionCards'
import { apiClient } from '@/lib/api/client'
import { queryKeys } from '@/lib/query/keys'

interface LeaderboardEntry {
  display_name: string
  total_value: number
  return_pct: number
}

function MarketStatusBadge() {
  const { data: config } = useQuery({
    queryKey: queryKeys.config(),
    queryFn: () => apiClient.get<{ marketStatus: string }>('/config/market-status'),
    refetchInterval: 60_000,
  })

  const status = config?.marketStatus ?? 'unknown'
  const color = status === 'open' ? '#22c55e'
    : status === 'pre-market' || status === 'after-hours' ? '#f59e0b'
    : '#6b7280'

  return (
    <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text variant="label" style={{ color }}>{status.toUpperCase()}</Text>
    </View>
  )
}

function LeaderboardPreview() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.leaderboard(),
    queryFn: () => apiClient.get<LeaderboardEntry[]>('/challenges/leaderboard'),
    staleTime: 5 * 60_000,
  })

  const top5 = data?.slice(0, 5) ?? []

  return (
    <View style={styles.section}>
      <Text variant="heading" style={styles.sectionTitle}>Leaderboard</Text>
      {isLoading ? (
        <Text variant="body" color="secondary">Loading...</Text>
      ) : top5.length === 0 ? (
        <Text variant="body" color="secondary">No rankings yet.</Text>
      ) : (
        top5.map((entry, i) => (
          <View key={i} style={styles.leaderRow}>
            <Text variant="label" color="secondary" style={styles.rank}>#{i + 1}</Text>
            <Text variant="body" style={styles.leaderName}>{entry.display_name}</Text>
            <Text
              variant="label"
              style={{ color: entry.return_pct >= 0 ? '#22c55e' : '#ef4444' }}
            >
              {entry.return_pct >= 0 ? '+' : ''}{Number(entry.return_pct).toFixed(1)}%
            </Text>
          </View>
        ))
      )}
    </View>
  )
}

export default function Home() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text variant="heading">Mockket</Text>
        <MarketStatusBadge />
      </View>

      <MissionCards />

      <LeaderboardPreview />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.bg.primary },
  content: { padding: tokens.spacing[4] },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing[6],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing[3],
    paddingVertical: tokens.spacing[1],
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  section: { marginTop: tokens.spacing[6] },
  sectionTitle: { marginBottom: tokens.spacing[3] },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.border?.default ?? '#e5e7eb',
  },
  rank: { width: 32 },
  leaderName: { flex: 1 },
})
```

**Note:** If `queryKeys.config()` and `queryKeys.leaderboard()` don't exist in `keys.ts`, add them. Also add a `/config/market-status` endpoint to `config.ts` that calls `getMarketStatus()` and returns `{ marketStatus }`.

**Step 3: Add market-status endpoint to config route**

```typescript
// In packages/api/src/routes/config.ts
import { getMarketStatus } from '../lib/alpaca'

configRouter.get('/market-status', async (_req, res) => {
  try {
    const marketStatus = await getMarketStatus()
    res.json({ marketStatus })
  } catch {
    res.json({ marketStatus: 'unknown' })
  }
})
```

**Step 4: Verify TypeScript compiles**

```bash
cd apps/mobile && npx tsc --noEmit
cd packages/api && npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add apps/mobile/app/(tabs)/index.tsx packages/api/src/routes/config.ts apps/mobile/src/lib/query/keys.ts
git commit -m "feat: build out Home screen with MissionCards, market status, leaderboard preview"
```

---

### Task 16: Add post-first-trade moment screen

After the user's first-ever trade, show a special celebration screen before returning to Home.

**Files:**
- Create: `apps/mobile/app/trade/first-trade-moment.tsx`
- Modify: `apps/mobile/app/trade/success.tsx`

**Step 1: Create the first-trade moment screen**

```typescript
// apps/mobile/app/trade/first-trade-moment.tsx
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { Text } from '@/components/primitives'
import { tokens } from '@/design/tokens'
import { apiClient } from '@/lib/api/client'

export default function FirstTradeMoment() {
  const router = useRouter()

  async function handleContinue() {
    try {
      await apiClient.patch('/users/ftue', { made_first_trade: true })
    } catch {
      // non-critical, continue regardless
    }
    router.replace('/(tabs)/')
  }

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🎉</Text>
      <Text variant="heading" style={styles.heading}>First Trade Complete</Text>
      <Text variant="body" color="secondary" style={styles.sub}>
        You just made your first paper trade. From here, every decision builds your track record. Make it count.
      </Text>
      <TouchableOpacity style={styles.cta} onPress={handleContinue}>
        <Text variant="label" style={{ color: '#fff' }}>Start Trading</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing[6],
  },
  emoji: { fontSize: 64, marginBottom: tokens.spacing[6] },
  heading: { textAlign: 'center', marginBottom: tokens.spacing[3] },
  sub: {
    textAlign: 'center',
    marginBottom: tokens.spacing[8],
    lineHeight: 22,
  },
  cta: {
    backgroundColor: tokens.colors.brand.default,
    borderRadius: tokens.radii.lg,
    paddingVertical: tokens.spacing[4],
    paddingHorizontal: tokens.spacing[8],
    width: '100%',
    alignItems: 'center',
  },
})
```

**Step 2: Update success.tsx to redirect first-time traders**

In `apps/mobile/app/trade/success.tsx`, add the FTUE check. The success screen receives `dayTradeCount` etc. from params but doesn't know if this is the first trade. Add a check using the FTUE API.

Add to imports:
```typescript
import { useEffect } from 'react'
import { apiClient } from '@/lib/api/client'
```

Inside `TradeSuccess`, after the `const dtCount = ...` line, add:

```typescript
  useEffect(() => {
    // Check if this is the user's first trade
    async function checkFirstTrade() {
      try {
        const ftue = await apiClient.get<{ made_first_trade?: boolean }>('/users/ftue')
        if (!ftue.made_first_trade) {
          router.replace('/trade/first-trade-moment')
        }
      } catch {
        // non-critical
      }
    }
    checkFirstTrade()
  }, [])
```

**Step 3: Verify TypeScript compiles**

```bash
cd apps/mobile && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add apps/mobile/app/trade/first-trade-moment.tsx apps/mobile/app/trade/success.tsx
git commit -m "feat: add post-first-trade moment screen"
```

---

## Phase 4: Medium / Low Polish

---

### Task 17: Add cursor pagination to GET /trades

`GET /trades` is hardcoded to LIMIT 50.

**Files:**
- Modify: `packages/api/src/routes/trades.ts`

**Step 1: Add before-cursor pagination**

Replace the `GET /trades` handler:

```typescript
tradesRouter.get('/', requireAuth, async (req, res) => {
  const userId = res.locals.userId
  const before = req.query.before as string | undefined
  if (before !== undefined && isNaN(Date.parse(before))) {
    return res.status(400).json({ error: 'before must be a valid ISO timestamp' })
  }
  const limit = 50

  const { rows } = before
    ? await db.query(
        `SELECT * FROM trades WHERE user_id = $1 AND executed_at < $2
         ORDER BY executed_at DESC LIMIT $3`,
        [userId, before, limit]
      )
    : await db.query(
        `SELECT * FROM trades WHERE user_id = $1
         ORDER BY executed_at DESC LIMIT $2`,
        [userId, limit]
      )
  res.json(rows)
})
```

**Step 2: Commit**

```bash
git add packages/api/src/routes/trades.ts
git commit -m "fix: add cursor pagination to GET /trades"
```

---

### Task 18: Verify JWT locally in auth middleware

Every request currently makes a network round-trip to Supabase to validate the JWT.

**Files:**
- Modify: `packages/api/src/middleware/auth.ts`

**Step 1: Install jsonwebtoken**

```bash
cd packages/api && npm install jsonwebtoken @types/jsonwebtoken
```

**Step 2: Update auth middleware to verify JWT locally**

```typescript
// packages/api/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_JWT_SECRET) {
  console.error('Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET')
  process.exit(1)
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  try {
    // Fast path: verify JWT locally using Supabase JWT secret
    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!) as { sub?: string }
    if (!decoded.sub) throw new Error('No sub claim')
    res.locals.userId = decoded.sub
    return next()
  } catch {
    // Fallback: remote verification (handles key rotation edge cases)
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (error || !user) return res.status(401).json({ error: 'Unauthorized' })
      res.locals.userId = user.id
      next()
    } catch {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }
}
```

**Step 3: Add SUPABASE_JWT_SECRET to env docs**

In `SETUP.md`, add:
```
SUPABASE_JWT_SECRET=   # from Supabase dashboard > Settings > API > JWT Secret
```

**Step 4: Verify TypeScript compiles**

```bash
cd packages/api && npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add packages/api/src/middleware/auth.ts packages/api/package.json packages/api/package-lock.json
git commit -m "fix: verify Supabase JWT locally to eliminate per-request network round-trip"
```

---

### Task 19: Return camelCase DTO from FTUE endpoint

`GET /users/ftue` returns raw snake_case DB columns.

**Files:**
- Modify: `packages/api/src/routes/users.ts`

**Step 1: Map the DB row in the FTUE GET handler**

Replace:
```typescript
  res.json(rows[0] ?? {})
```

With:
```typescript
  const row = rows[0]
  if (!row) return res.json({})
  res.json({
    viewedMarcusProfile: row.viewed_marcus_profile,
    madeFirstTrade: row.made_first_trade,
    startedChallenge: row.started_challenge,
    agentIntroSent: row.agent_intro_sent,
    firstTradeAnnotationShown: row.first_trade_annotation_shown,
    day2CardShown: row.day2_card_shown,
  })
```

**Step 2: Update mobile code that reads FTUE fields**

Search for all usages of snake_case FTUE field names in mobile:
```bash
cd apps/mobile && grep -rn "made_first_trade\|agent_intro_sent\|day2_card_shown\|viewed_marcus_profile" src/ app/
```

Update each usage to use the new camelCase field names (`madeFirstTrade`, `agentIntroSent`, etc.).

**Step 3: Update the PATCH /users/ftue handler**

The PATCH currently accepts snake_case field names from the client (which matches `ALLOWED_FTUE_FIELDS`). Keep PATCH accepting camelCase too, or document that PATCH uses snake_case keys. For simplicity, keep PATCH as-is (internal field names).

**Step 4: Verify TypeScript compiles**

```bash
cd packages/api && npx tsc --noEmit
cd apps/mobile && npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add packages/api/src/routes/users.ts
git commit -m "fix: return camelCase DTO from GET /users/ftue"
```

---

### Task 20: Fix FCM db parameter type

`sendPushToUser` accepts `db?: any`. Since Task 1 already removes the `db` parameter entirely, this is resolved as part of Task 1. Skip this task.

---

### Task 21: Fix fragile agent lookup in generate-recommendations

Already resolved in Task 6 (uses `AGENTS.find()` pattern). Skip this task.

---

### Task 22: Add P&L to recap screen

The end-of-challenge recap shows only status and starting balance.

**Files:**
- Modify: `apps/mobile/app/recap/[challengeId].tsx`
- Modify: `packages/api/src/routes/challenges.ts`

**Step 1: Add return_pct to GET /challenges/:id**

In `packages/api/src/routes/challenges.ts`, replace the `GET /:id` handler:

```typescript
challengesRouter.get('/:id', requireAuth, async (req, res) => {
  const userId = res.locals.userId
  const { rows } = await db.query(
    `SELECT c.*,
       c.challenge_cash + COALESCE(
         (SELECT SUM(h.quantity * COALESCE(cp.price, h.avg_cost))
          FROM holdings h
          LEFT JOIN current_prices cp ON cp.ticker = h.ticker
          WHERE h.user_id = $2 AND h.challenge_id = c.id),
         0
       ) AS final_value,
       CASE WHEN c.starting_balance > 0 THEN
         ((c.challenge_cash + COALESCE(
           (SELECT SUM(h.quantity * COALESCE(cp.price, h.avg_cost))
            FROM holdings h
            LEFT JOIN current_prices cp ON cp.ticker = h.ticker
            WHERE h.user_id = $2 AND h.challenge_id = c.id),
           0
         ) - c.starting_balance) / c.starting_balance * 100)
       ELSE 0 END AS return_pct
     FROM challenges c
     WHERE c.id = $1 AND (c.user_id = $2 OR c.opponent_user_id = $2)`,
    [req.params.id, userId]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Not found' })
  res.json(rows[0])
})
```

**Step 2: Read the recap screen to understand current structure**

Read `apps/mobile/app/recap/[challengeId].tsx` and add `final_value` and `return_pct` display. Look for where `starting_balance` is rendered and add the return % below it.

**Step 3: Commit**

```bash
git add packages/api/src/routes/challenges.ts apps/mobile/app/recap/[challengeId].tsx
git commit -m "feat: add final portfolio value and return % to challenge recap screen"
```

---

### Task 23: Fix PDT warning threshold

Banner shows at `dtCount >= 2` (2nd day trade). Should show at `dtCount >= 3` ("approaching" the 4-trade limit).

**Files:**
- Modify: `apps/mobile/app/trade/success.tsx`

**Step 1: Change threshold**

In `apps/mobile/app/trade/success.tsx`, find:
```typescript
      {dtCount >= 2 && (
```

Replace with:
```typescript
      {dtCount >= 3 && (
```

**Step 2: Commit**

```bash
git add apps/mobile/app/trade/success.tsx
git commit -m "fix: show PDT warning at 3+ day trades (approaching 4-trade limit)"
```

---

### Task 24: Add mocked unit tests for alpaca.ts and fix ledger test isolation

The test suite has only 2 files, no mocks, and the ledger tests have state dependencies between test cases.

**Files:**
- Create: `packages/api/src/lib/__tests__/alpaca.unit.test.ts`
- Modify: `packages/api/src/lib/__tests__/ledger.test.ts`

**Step 1: Create mocked unit tests for alpaca.ts**

```typescript
// packages/api/src/lib/__tests__/alpaca.unit.test.ts
import axios from 'axios'
import { getQuote, getMarketStatus } from '../alpaca'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

const mockClient = {
  get: jest.fn(),
}
mockedAxios.create.mockReturnValue(mockClient as any)

// Re-import to get the module with the mocked axios client
jest.resetModules()

describe('getQuote', () => {
  it('returns ask, bid, and mid from Alpaca response', async () => {
    mockClient.get.mockResolvedValueOnce({
      data: { quote: { ap: 150.50, bp: 150.00 } }
    })

    const { getQuote: getQuoteFresh } = await import('../alpaca')
    const result = await getQuoteFresh('AAPL')

    expect(result.ticker).toBe('AAPL')
    expect(result.ask).toBe(150.50)
    expect(result.bid).toBe(150.00)
    expect(result.mid).toBeCloseTo(150.25)
  })

  it('throws when Alpaca returns an error', async () => {
    mockClient.get.mockRejectedValueOnce(new Error('Network error'))
    const { getQuote: getQuoteFresh } = await import('../alpaca')
    await expect(getQuoteFresh('INVALID')).rejects.toThrow('Network error')
  })
})

describe('getMarketStatus', () => {
  it('returns open when is_open is true', async () => {
    mockClient.get.mockResolvedValueOnce({
      data: { is_open: true, next_open: new Date().toISOString(), next_close: new Date().toISOString() }
    })
    const { getMarketStatus: getMarketStatusFresh } = await import('../alpaca')
    const result = await getMarketStatusFresh()
    expect(result).toBe('open')
  })

  it('returns closed on weekend', async () => {
    // Set next_open to Monday
    const nextMonday = new Date()
    nextMonday.setDate(nextMonday.getDate() + ((8 - nextMonday.getDay()) % 7 || 7))
    nextMonday.setHours(9, 30, 0, 0)

    mockClient.get.mockResolvedValueOnce({
      data: { is_open: false, next_open: nextMonday.toISOString(), next_close: nextMonday.toISOString() }
    })
    const { getMarketStatus: getMarketStatusFresh } = await import('../alpaca')
    const result = await getMarketStatusFresh()
    expect(result).toBe('closed')
  })
})
```

**Step 2: Fix ledger test isolation**

Read `packages/api/src/lib/__tests__/ledger.test.ts`. For each test that depends on prior state (e.g. `sell` assuming `buy` ran first), wrap each test in a `beforeEach`/`afterEach` that runs the setup it needs directly, or use a test DB transaction that rolls back.

The simplest fix: at the start of each test, run any required setup inline rather than relying on test ordering. Move shared setup into `beforeEach`.

**Step 3: Run tests to verify**

```bash
cd packages/api && npm test -- --testPathPattern="alpaca.unit|ledger" --verbose
```
Expected: all pass.

**Step 4: Commit**

```bash
git add packages/api/src/lib/__tests__/alpaca.unit.test.ts packages/api/src/lib/__tests__/ledger.test.ts
git commit -m "test: add mocked unit tests for alpaca.ts, fix ledger test isolation"
```

---

## Summary

| Phase | Tasks | Key Outcomes |
|---|---|---|
| 1 — Critical | 1–3 | Push notifications work, resets are IAP-gated, trades respect market hours |
| 2 — High | 4–11 | Trade error handling, WS subscriptions, advisory recs use real logic, leaderboard correct, challenge cash isolated |
| 3 — MVP Features | 12–16 | Dividend credits, split adjustments, earnings endpoint, Home screen, first-trade moment |
| 4 — Polish | 17–24 | Pagination, faster auth, clean DTOs, PDT threshold, P&L on recap, unit tests |

**Execution order:** Tasks within the same phase are independent and can be parallelized. Tasks 1 and 7 should be done before 6 (FCM used in recommendations, MarketData type used in agent modules).
