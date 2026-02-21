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
| Auth | Supabase Auth | Email + Apple + Google sign-in. Session stored in device keychain via expo-secure-store. |
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

## Critical Coding Constraints

Rules where getting it wrong produces incorrect behavior. See PRD.md for full context on all of these.

- **Trade and challenge history are permanent.** Never delete records on reset — only the cash balance resets.
- **Agent log fields are required:** timestamp, ticker, action, quantity, price at execution, in-character rationale string.
- **Advisory rationale is hidden until post-trade.** Never return it on the recommendation approval screen — only after the user acts.
- **Buy at ask, sell at bid.** Never execute at mid price.
- **Resets:** blocked while any challenge is active. All agent hires are auto-paused on reset; user must manually re-confirm each.
- **Agent reactions:** max 1 per agent per day. Triggers: (1) user trades >3% of portfolio value, or (2) user trades a ticker the agent holds or recently traded.
- **Agent allocation:** min $1,000, max 50% of available cash.
- **PDT warning is educational only.** Never block a trade — surface the warning at 2+ day trades in a 5-day window.

For full product rules, screen specs, feature details, and edge cases, see PRD.md.

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
  getRationale(trade: Trade): string;        // in-character explanation for the log
  react(userTrade: Trade): string;           // in-character reaction to user's move (max 1/day)
  preview(proposed: ProposedTrade): string;  // pre-trade "what would I do?" response (on-demand, not advisory)
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
  status: "pending" | "active" | "completed" | "forfeited" | "expired"
  // "pending" = friend challenge sent, awaiting acceptance
  // "expired" = friend challenge not accepted within 24h
  isForfeited: boolean           // true if user exited early
  inviteToken: string (nullable) // for friend challenge invite links
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

**Core trading**
- [x] Alpaca API integration (stocks, paper trading)
- [x] WebSocket price feed → Redis pub/sub → client
- [x] Bid/ask spread on trade confirmation (buy at ask, sell at bid)
- [x] Market hours enforcement + after-hours order queuing
- [x] Market status indicator (OPEN / CLOSED / PRE-MARKET / AFTER-HOURS)
- [x] PDT warning (2+ day trades in 5-day window)
- [x] Dividend credits on ex-dividend date
- [x] Stock split position adjustment
- [x] Earnings calendar badges (within 7 days of reporting)

**Portfolio & agents**
- [x] Portfolio management (cash balance, holdings, P&L)
- [x] Marcus and Priya agent modules
- [x] Advisory mode recommendation flow
- [x] Agent trade log with rationale

**Challenges & social**
- [x] 1-week and 1-month challenge creation and scoring
- [x] Friend challenge invite flow (link + username search)
- [x] Leaderboard (top 50, opt-in to appear, top 5 preview on Home)
- [x] End-of-challenge recap screen

**FTUE**
- [x] Mission 1 cards on Home (3 sequential actions)
- [x] Agent intro message (Marcus, fires within 2 min of account creation)
- [x] Annotated first trade confirmation (bid/ask + execution price labels)
- [x] Post-first-trade moment screen
- [x] Day 2 re-engagement message

**Infrastructure**
- [x] Auth (email + Apple + Google)
- [x] Portfolio reset IAP ($0.99)
- [x] Push notifications (FCM)

**Still missing**
- [x] Agent reactions (max 1/day: triggers on >3% portfolio trade or agent-held ticker)
