# ARCHITECTURE.md — Mockket System Architecture

---

## System Overview

Mockket is a paper trading platform where a React Native mobile app connects to a Node.js backend. The backend manages Alpaca paper trading accounts on behalf of users (users never interact with Alpaca directly), streams real-time market prices via WebSocket, runs agent rebalancing on cron schedules, and persists all data in Postgres with Redis for caching and pub/sub fan-out.

---

## Data Flow

```
                        REST (trades, portfolio, auth)
                    +----------------------------------+
                    |                                  |
  +-----------+     |     +----------+     +---------+ |    +--------+
  |  Alpaca   |--WS-+--->|  Node.js |---->| Redis   | +--->| Mobile |
  |  Markets  |     |    |  Backend |     | pub/sub | |    |  App   |
  |  API      |<-REST--->|          |---->| cache   | |    |        |
  +-----------+          +----+-----+     +---------+ |    +--------+
                              |                       |        ^
                              v                       |        |
                         +----------+                 |   WS (prices)
                         | Postgres |                 |        |
                         | (trades, |           +-----+--------+
                         |  users,  |           | Backend WS server
                         |  agents) |           | fans out via Redis
                         +----------+           +------------------+
```

**Price flow in detail:**

```
Alpaca WS ──> Backend WS server ──> Redis pub/sub ──> Backend WS fan-out ──> Mobile WS client
                                                                                    |
                                                                                    v
                                                                          TanStack Query cache
                                                                                    |
                                                                                    v
                                                                          usePrice(ticker) hook
                                                                                    |
                                                                                    v
                                                                           React component
```

---

## State Ownership

| What | Where | Details |
|---|---|---|
| Live prices | TanStack Query cache | Populated by WebSocket client, read via `usePrice(ticker)` with `staleTime: Infinity` |
| Portfolio data | TanStack Query cache | Fetched from API, keyed by `queryKeys.portfolio(userId)` |
| Holdings | TanStack Query cache | Fetched from API, keyed by `queryKeys.holdings(userId)` |
| Agent list | TanStack Query cache | Fetched from API, keyed by `queryKeys.agents()` |
| Agent recommendations | TanStack Query cache | Fetched from API, keyed by `queryKeys.recommendations(userId)` |
| Challenges | TanStack Query cache | Fetched from API, keyed by `queryKeys.challenges(userId)` |
| Auth token | Zustand store | `useAuthStore` in `features/auth/store.ts`, persists user + token |
| Current user | Zustand store | `useAuthStore.user`, set on login, cleared on logout |
| UI modal state | Zustand store | Per-feature store, e.g. `features/<feature>/store.ts` |
| Selected tab | Expo Router | Managed by `app/(tabs)/_layout.tsx`, no manual state needed |

**Rule of thumb:** If data comes from the server, it goes in TanStack Query. If it is client-only UI state, it goes in a Zustand store scoped to the feature.

---

## Key Architectural Decisions

### 1. Alpaca is a read-only price feed

Alpaca is used exclusively for real-time stock prices and WebSocket market data. No trades are submitted to Alpaca and no per-user Alpaca accounts are created. All portfolio state (cash, holdings, P&L) lives in Postgres as a virtual ledger. When a trade executes, the backend fetches the current ask/bid price from Alpaca, records the trade in the `trades` table, and updates `users.portfolio_cash` and the `holdings` table. This keeps the mobile app simple (no API key management) and lets us enforce all product rules server-side.

### 2. Agent logic is rule-based, not ML

Each agent is an isolated TypeScript module exporting a `rebalance()` function. The cron job calls each active agent's rebalance function on schedule. There is no shared state between agents, no model training, no inference server. Adding a new agent means adding a new module file — zero changes to existing code. This keeps the system simple, deterministic, and debuggable.

### 3. WebSocket prices bridge into TanStack Query cache

Rather than maintaining a separate Zustand store for live prices, the WebSocket client writes directly into TanStack Query cache via `queryClient.setQueryData()`. Components read prices through `usePrice(ticker)` with `staleTime: Infinity`, meaning they never re-fetch — they always read the latest WS value. This eliminates an entire state synchronization layer and keeps price data in the same system as all other server data.

### 4. Advisory recommendation rationale is revealed post-trade

When an agent recommends a trade in advisory mode, the user sees the ticker, action, and quantity — but NOT the rationale. The rationale is revealed only after the user approves or rejects the recommendation. This prevents users from getting free alpha without engaging with the agent, and it creates a better UX moment of "here's why I suggested that."

### 5. Portfolio resets are IAP-gated and never delete history

Resetting costs $0.99 (IAP). A reset sets `portfolioCash` back to $100,000 and pauses all agent hires (`isPaused = true`), but it never deletes trade history, challenge history, or agent logs. The `resetCount` on the user profile is incremented. This preserves the integrity of the leaderboard and historical performance data.

### 6. Challenge portfolios are separate

When a user starts a challenge, cash is drawn from their main portfolio into a separate challenge balance. Trades within a challenge are tagged with `challengeId`. The winner is determined by percentage return, not absolute dollars. This prevents users with larger portfolios from having an inherent advantage.

---

## Package Dependency Graph

```
packages/shared          (no dependencies)
    ^          ^
    |          |
packages/agents     packages/api
(depends on shared) (depends on shared)
                         ^
                         |
                    apps/mobile
              (depends on shared)
```

- `packages/shared` is the leaf — it has zero internal dependencies.
- `packages/agents` imports types from `@mockket/shared`.
- `packages/api` imports types from `@mockket/shared` and will import agent modules from `@mockket/agents` at runtime for cron jobs.
- `apps/mobile` imports types from `@mockket/shared`. It does NOT import from `@mockket/agents` or `@mockket/api` directly — it communicates with the API via HTTP/WebSocket.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ALPACA_API_KEY` | Yes | Alpaca Markets API key for paper trading |
| `ALPACA_API_SECRET` | Yes | Alpaca Markets API secret |
| `ALPACA_BASE_URL` | Yes | Alpaca paper trading endpoint (e.g. `https://paper-api.alpaca.markets`) |
| `COINGECKO_API_KEY` | No | CoinGecko API key. Free tier works without a key for basic price data. |
| `DATABASE_URL` | Yes | Postgres connection string (e.g. `postgresql://user:pass@host:5432/mockket`) |
| `REDIS_URL` | Yes | Redis connection string for caching and pub/sub |
| `FIREBASE_PROJECT_ID` | Yes | Firebase project ID for auth and push notifications |
| `FIREBASE_SERVICE_ACCOUNT` | Yes | Firebase service account JSON as a single-line string (from Firebase console > Project settings > Service accounts) |
| `APPLE_CLIENT_ID` | Yes | Apple Developer client ID for Sign in with Apple |
| `REVENUECAT_SECRET_KEY` | Yes | RevenueCat server-side secret for verifying IAP receipts (RevenueCat dashboard > API keys) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key — server-side only, never expose to client |
| `SUPABASE_JWT_SECRET` | Yes | Supabase JWT secret for local token verification (Supabase dashboard > Settings > API) |
| `POLYGON_API_KEY` | No | Polygon.io API key for dividends, earnings, and stock splits. Features silently skip without it. |
| `PORT` | No | API server port. Defaults to `3000`. |
