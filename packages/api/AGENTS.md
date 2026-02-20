# AGENTS.md — API Package Guide (`packages/api/`)

---

## What This Package Is

The Node.js backend for Mockket. It handles:

- **REST API** — CRUD for trades, portfolios, users, challenges, agent hires, recommendations
- **WebSocket server** — streams real-time market prices to connected mobile clients
- **Cron jobs** — runs agent rebalancing on schedule
- **Database access** — Postgres via connection pool
- **Alpaca proxy** — all paper trading operations go through this server, not directly from the client

Entry point: `packages/api/src/index.ts`

---

## Directory Structure

```
packages/api/src/
  index.ts              # Server entry point (Express + WS setup)
  routes/               # REST API route handlers
    portfolio.ts        # GET/POST portfolio, reset
    trades.ts           # GET trades, POST execute trade
    agents.ts           # GET agents, POST hire/pause/resume
    challenges.ts       # GET/POST challenges, forfeit
    recommendations.ts  # GET recommendations, POST approve/reject
    auth.ts             # POST login, register, refresh
  ws/                   # WebSocket server
    price-feed.ts       # Alpaca WS -> Redis pub/sub -> client fan-out
  cron/                 # Scheduled jobs
    rebalance.ts        # Agent rebalancing scheduler
    recommendations.ts  # Expire stale recommendations (24h)
  db/                   # Database layer
    client.ts           # Postgres connection pool
    queries/            # SQL query functions by domain
  middleware/            # Express middleware
    auth.ts             # JWT verification, user context
    error.ts            # Global error handler
    validate.ts         # Request validation
```

---

## WebSocket Architecture

The backend maintains a **single** WebSocket connection to Alpaca Markets for live price data. It does NOT create one Alpaca connection per user.

```
Alpaca WS (1 connection)
    |
    v
Backend WS server
    |
    v
Redis pub/sub (channel per ticker)
    |
    v
Fan-out to all connected mobile clients
```

### How it works

1. Backend connects to Alpaca's streaming API on startup.
2. When Alpaca sends a price update, the backend publishes it to a Redis channel (e.g. `price:AAPL`).
3. The WebSocket server subscribes to Redis channels matching the tickers that connected clients care about.
4. When a Redis message arrives, the server broadcasts it to all WebSocket clients subscribed to that ticker.
5. The mobile client receives the message and writes it into TanStack Query cache via `queryClient.setQueryData()`.

**The mobile client connects to OUR backend WebSocket, never directly to Alpaca.**

---

## Cron Schedule

| Job | Schedule | What it does |
|---|---|---|
| Stock agent rebalance | Daily at market open (9:30 AM ET, weekdays) | Calls `rebalance()` for all active agents where `rebalanceInterval === 'daily'` and `assetClasses` includes `'stocks'` |
| Crypto agent rebalance | Every 6 hours (00:00, 06:00, 12:00, 18:00 UTC) | Calls `rebalance()` for all active agents where `rebalanceInterval === '6h'` |
| Recommendation expiry | Every hour | Sets `status = 'expired'` on recommendations older than 24 hours that are still `'pending'` |
| Weekend commentary | Saturday 10:00 AM ET | Triggers one in-character commentary message from each stock-only agent (no trades) |

### Rebalance execution flow

1. Cron job fires.
2. Query all `AgentHire` records where `isActive === true` and `isPaused === false`.
3. For each hire, load the user's portfolio and current market data.
4. Call `agent.rebalance(portfolio, marketData)`.
5. For each returned `Trade`, execute it via Alpaca, record in DB with the agent's rationale.
6. If `rebalance()` throws, log the error and skip that agent (do not halt other agents).

---

## Alpaca Integration

All trades are proxied through the backend. The mobile app never communicates with Alpaca directly.

- The backend creates and manages Alpaca paper trading accounts.
- Users do not need Alpaca accounts or API keys.
- Trade execution flow: Mobile app -> REST API -> Backend validates -> Alpaca paper trading API -> Record in Postgres.
- The backend uses `ALPACA_API_KEY`, `ALPACA_API_SECRET`, and `ALPACA_BASE_URL` environment variables.

---

## Key Rules

### Trade records are never deleted

Every trade is permanent. The `trades` table is append-only. There is no DELETE endpoint, no soft-delete flag, no archive mechanism. Trade history survives portfolio resets, account changes, and any other user action.

### Agent logs must store complete data

Every agent-executed trade must be recorded with ALL of these fields:

| Field | Source |
|---|---|
| `executedAt` | Timestamp at execution (ISO 8601) |
| `ticker` | The asset traded |
| `action` | `'buy'` or `'sell'` |
| `quantity` | Number of shares/units |
| `priceAtExecution` | Price at the moment the trade was filled |
| `rationale` | In-character string from `agent.getRationale(trade)` |
| `agentId` | The agent's slug (e.g. `'marcus-bull-chen'`) |
| `userId` | The user who hired the agent |
| `challengeId` | Set if the trade was within a challenge portfolio, `null` otherwise |

### Portfolio resets must NOT delete history

When a user resets their portfolio:

1. Set `user.portfolioCash = 100000`
2. Increment `user.resetCount`
3. Set `agentHire.isPaused = true` for ALL of the user's active hires
4. Set `agentHire.pausedAt` to current timestamp
5. **Do NOT** delete any rows from `trades`, `challenges`, or agent log tables
6. The user must manually re-confirm each agent hire to restart it

### Challenge portfolio isolation

- Challenge cash is drawn from the main portfolio at challenge start. Deduct from `user.portfolioCash`.
- Trades within a challenge must have `challengeId` set.
- Challenge winner is determined by `% return = (endBalance - startingBalance) / startingBalance`.
- Early exit sets `status = 'forfeited'` and `isForfeited = true`. Cash is NOT returned on forfeit (it remains in the challenge balance until completion time).

### Advisory recommendations

- Max 1 recommendation per agent per day per user.
- Recommendations expire after 24 hours (`status` changes from `'pending'` to `'expired'`).
- The `rationale` field must NOT be included in API responses for `'pending'` recommendations. It is only returned after the user acts (status becomes `'approved'` or `'rejected'`).
