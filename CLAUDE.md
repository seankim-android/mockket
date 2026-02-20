# CLAUDE.md — Mockket Project Context

This file is the persistent context for Claude Code sessions on the Mockket project. Read this before starting any task. Full feature spec is in PRD.md.

---

## What We're Building

Mockket is a mobile paper trading app where users invest fake money in real markets and compete against or hire AI trading agents. Each agent has a name, personality, and real performance history. Users can trade manually, let agents run on autopilot, or get trade recommendations from agents in advisory mode.

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Mobile | React Native | Cross-platform, iOS + Android |
| Market Data | Alpaca Markets API | Free tier, covers US stocks + crypto |
| Crypto fallback | CoinGecko API | Price data only |
| Backend | Node.js | WebSocket server for live prices |
| Database | Postgres | Trade history, portfolios, users |
| Cache | Redis | Real-time price caching, sessions |
| Auth | Supabase or Firebase Auth | Email + Apple + Google sign-in |
| Notifications | Firebase Cloud Messaging | Push notifications |
| Agent scheduling | Node cron jobs | Agent rebalancing runs on schedule |

---

## Architecture Decisions

**Agent logic is rule-based, not ML.** Each agent is an isolated module exporting a `rebalance()` function. The cron job calls each active agent's rebalance function on its schedule. No shared state between agents. Adding a new agent = adding a new module, no changes to existing code.

**Agent rebalancing schedule:**
- Stocks: once daily at market open
- Crypto: every 6 hours, 24/7

**Advisory mode recommendations expire after 24 hours.** If user doesn't act, the recommendation is dismissed and logged as "ignored" in the trade comparison view.

**Portfolio resets are IAP-gated ($0.99).** A reset sets cash balance back to $100,000 but never deletes trade history, challenge history, or agent logs. Reset count is stored on user profile.

**Alpaca paper trading accounts are managed server-side.** We create and manage Alpaca paper accounts on the backend, proxying all trades through our server. Users do not need Alpaca accounts.

**Real-time prices via WebSocket.** Client subscribes to a price feed on connect. Backend maintains a single Alpaca WebSocket connection and fans out to connected clients via Redis pub/sub.

---

## Key Product Rules

- Trade history is permanent. Never delete it, even on reset.
- Agent logs must include: timestamp, ticker, action (buy/sell), quantity, price at execution, in-character rationale string.
- Challenge history is permanent. Resets do not affect challenge records.
- Free users: advisory mode only, one active challenge, standard analytics, agent holdings with 24h delay.
- Premium users: autopilot mode, multiple challenges, advanced analytics, real-time agent holdings visibility.
- No ads, ever.

**Resets:**
- Portfolio resets are blocked while any challenge is active.
- On reset, all agent hires are paused. User must manually re-confirm each hire to restart.

**Challenges:**
- Challenge portfolios are separate from the main portfolio. Cash is drawn from main portfolio cash at challenge start.
- Challenge winner is determined by % return, not absolute dollar return.
- Users can exit a challenge early; it is recorded as a forfeit/loss in challenge history.
- Advisory mode recommendations from hired agents can apply to the challenge portfolio.
- Challenges score against the V1 duration of 1 month only (MVP).

**Agent behavior:**
- Advisory recommendations: max 1 per agent per day per user.
- Advisory recommendation reasoning is revealed post-trade only (not shown on approval screen).
- Agent reactions trigger only on user trades >5% of portfolio value, max 1 reaction per agent per day.
- Stock-only agents send one in-character Saturday commentary message on weekends (no trades).

**Agent allocation:**
- Minimum allocation: $1,000. Maximum allocation: 50% of available cash.

**Leaderboard:**
- Global leaderboard is opt-in. Users must enable it in settings.
- Ranked by 30-day rolling % return on main portfolio.

---

## Agent Module Interface

Each agent module must export:

```typescript
interface Agent {
  id: string;                    // unique slug, e.g. "marcus-bull-chen"
  name: string;                  // display name
  shortName: string;             // e.g. "Marcus"
  strategy: string;              // one-line description
  riskLevel: "low" | "medium" | "high" | "degen";
  assetClasses: ("stocks" | "crypto")[];
  rebalanceInterval: "daily" | "6h" | "never";
  
  rebalance(portfolio: Portfolio, marketData: MarketData): Promise<Trade[]>;
  getRationale(trade: Trade): string;  // in-character explanation for the log
  react(userTrade: Trade): string;     // in-character reaction to user's move
}
```

---

## V1 Agents (MVP)

- **marcus-bull-chen** — momentum, stocks + crypto, daily rebalance
- **priya-sharma** — value investing, stocks only, daily rebalance

## V2 Agents

- **hodl-hannah** — crypto only, never rebalances
- **the-quant** — technical indicators, stocks + crypto, 6h rebalance
- **the-degen** — altcoins/memecoins, crypto only, 6h rebalance
- **elena-steady-park** — dividends, stocks only, daily rebalance

---

## Data Models (Core)

```typescript
User {
  id, email, displayName, isPremium
  portfolioCash: number          // current fake cash balance
  resetCount: number             // lifetime resets
  leaderboardOptIn: boolean      // user must opt in to appear on leaderboard
  createdAt, updatedAt
}

Trade {
  id, userId, agentId (nullable)
  ticker, action: "buy"|"sell"
  quantity, priceAtExecution
  rationale: string              // agent rationale or user note (revealed post-trade for advisory)
  challengeId (nullable)        // set if trade was made within a challenge portfolio
  executedAt
}

AgentHire {
  id, userId, agentId
  allocatedCash: number          // min $1,000, max 50% of available cash at hire time
  mode: "advisory" | "autopilot"
  isActive: boolean
  isPaused: boolean              // auto-set to true on portfolio reset; user must re-confirm
  hiredAt, pausedAt (nullable)
}

Challenge {
  id, userId, agentId (nullable), opponentUserId (nullable)
  duration: "1w" | "1m" | "3m"
  startingBalance: number        // cash drawn from main portfolio at challenge start
  status: "active" | "completed" | "forfeited"
  isForfeited: boolean           // true if user exited early
  startedAt, endsAt, completedAt (nullable)
  winnerId (nullable)            // determined by % return
}

AgentRecommendation {
  id, userId, agentId, challengeId (nullable)  // nullable = main portfolio, set = challenge portfolio
  ticker, action: "buy"|"sell"
  quantity, rationale            // rationale not shown to user until after they act
  status: "pending" | "approved" | "rejected" | "expired"
  createdAt, expiresAt, actedAt (nullable)
}
```

---

## File Structure

```
/
├── CLAUDE.md              # this file
├── PRD.md                 # full product spec
├── apps/
│   └── mobile/            # React Native app
├── packages/
│   ├── agents/            # agent modules (one file per agent)
│   ├── api/               # Node.js backend
│   └── shared/            # shared types and utilities
```

---

## Environment Variables Needed

```
ALPACA_API_KEY
ALPACA_API_SECRET
ALPACA_BASE_URL            # paper trading endpoint
COINGECKO_API_KEY          # optional, free tier available without key
DATABASE_URL               # Postgres connection string
REDIS_URL
FIREBASE_PROJECT_ID
FIREBASE_SERVICE_ACCOUNT
APPLE_CLIENT_ID            # for Sign in with Apple
```

---

## MVP Checklist

- [ ] Alpaca API integration (stocks, paper trading)
- [ ] WebSocket price feed → Redis pub/sub → client
- [ ] Portfolio management (cash balance, holdings, P&L)
- [ ] Marcus and Priya agent modules
- [ ] Advisory mode recommendation flow
- [ ] 1-month challenge creation and scoring
- [ ] Agent trade log with rationale
- [ ] End-of-challenge recap screen
- [ ] Auth (email + Apple + Google)
- [ ] Portfolio reset IAP ($0.99)
- [ ] Push notifications (FCM)
