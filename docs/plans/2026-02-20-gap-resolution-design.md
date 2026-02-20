# Gap Resolution Design
**Date:** 2026-02-20
**Status:** Approved

This document resolves the architectural gaps identified in the PRD readiness review. All decisions below were approved by the product owner.

---

## 1. Backend Architecture

### Alpaca Role
Alpaca is a **read-only price feed and WebSocket market data source only**. No trades are submitted to Alpaca. No per-user Alpaca accounts are created.

- Alpaca free tier → real-time stock prices, WebSocket streaming, bid/ask spreads
- Single shared Alpaca connection on the backend, fanned out to clients via Redis pub/sub

### Virtual Ledger
All portfolio state lives in **Postgres**. When a trade executes:
1. Backend fetches current ask (buy) or bid (sell) price from Alpaca
2. Records trade in the `Trade` table
3. Updates `users.portfolioCash` and a `Holdings` table
4. P&L is calculated by us on read — never stored as a snapshot

Agent `rebalance()` functions write to the same virtual ledger via cron. Agents are treated as a special `userId` in the trade ledger — no special Alpaca handling.

### Market Data Sources
| Data type | Source | Freshness |
|---|---|---|
| Real-time stock prices | Alpaca free tier | Live (WebSocket) |
| Bid/ask spreads | Alpaca free tier | Live |
| Dividends | Polygon.io free tier | Nightly batch, cached in Postgres |
| Earnings calendar | Polygon.io free tier | Nightly batch, cached in Postgres |
| Stock splits | Polygon.io free tier | Nightly batch, cached in Postgres |

Polygon.io free tier: 5 API calls/min. Nightly batch jobs run at 2am ET, well within rate limits for the stock universe we support.

---

## 2. Navigation Structure

### Bottom Tab Bar
```
[ Home ] [ Markets ] [ Agents ] [ Challenges ] [ Portfolio ]
```

Tab order reflects the FTUE flow: orientation → first trade → hire an agent → compete → track progress.

Trade is **not** a standalone tab. Users reach the TradeScreen by tapping a stock from Markets, from an agent's trade log, or from a RecommendationScreen.

### Navigation Graph

```
Home
  └── AgentProfile (from feed items or FTUE cards)
  └── RecommendationScreen (from push notification deep link)

Markets
  └── StockDetail
        └── TradeScreen
              └── TradeConfirmation → TradeSuccess

Agents
  └── AgentMarketplace (default)
  └── AgentProfile
        └── TradeLog
        └── HireFlow
  └── HiredAgentDetail
        └── RecommendationScreen

Challenges
  └── ChallengeList (default: active + history)
  └── NewChallenge flow
  └── ChallengeDetail → TradeComparison
  └── Recap → PostChallengeAutopsy
  └── Leaderboard
  └── ChallengeInviteScreen (deep link target)

Portfolio
  └── PortfolioDetail (holdings, P&L, analytics)
  └── Settings
        └── PremiumPaywall
```

---

## 3. Advisory Recommendation Flow

### Sequence
```
1. Agent cron generates recommendation
   → writes AgentRecommendation { status: "pending" }
   → sends FCM push notification

2. User taps notification
   → Universal Link: https://mockket.app/recommendation/{id}
   → app opens RecommendationScreen

3. RecommendationScreen (pre-action)
   → shows: agent name, ticker, action, quantity, execution price, expiry countdown
   → rationale: NOT fetched or rendered
   → actions: [Approve] [Reject]

4. User acts
   → PATCH /recommendations/{id} { action: "approved" | "rejected" }
   → if approved: trade executes via virtual ledger
   → status: "approved" | "rejected"

5. RecommendationScreen (post-action)
   → rationale now fetched and revealed inline
   → "Why does [concept] matter?" link appears if applicable
   → nav back to Agents tab

6. Expiry (24h, no action)
   → backend cron sets status: "expired"
   → card renders with "Expired" badge, buttons hidden
```

### Rationale Hiding — Server-Side Enforcement
Two separate API endpoints:
- `GET /recommendations/{id}/preview` — returns ticker, action, quantity, price, expiry. **No rationale field.**
- `GET /recommendations/{id}/rationale` — returns rationale only. **Only callable after status is "approved" or "rejected".** Returns 403 if status is "pending" or "expired".

Rationale is never included in the pre-action response. This is enforced server-side, not just omitted client-side.

---

## 4. IAP & Monetization Infrastructure

### Library
**RevenueCat** via `react-native-purchases`. Handles StoreKit 2 (iOS), Google Play Billing (Android), receipt validation, subscription webhooks, and restore purchases.

### Products
| Product ID | Type | Price | MVP? |
|---|---|---|---|
| `mockket_premium_monthly` | Auto-renewable subscription | $7.99/mo | Yes |
| `mockket_premium_annual` | Auto-renewable subscription | $59.99/yr | Yes |
| `mockket_reset` | Consumable | $0.99 | Yes |
| `mockket_replay_covid` | Non-consumable | $2.99 | No (V2) |
| `mockket_replay_meme` | Non-consumable | $2.99 | No (V2) |
| `mockket_replay_ratehike` | Non-consumable | $1.99 | No (V2) |

### Flow
1. RevenueCat validates receipts server-side
2. RevenueCat sends webhooks to our backend on subscription events (purchased, renewed, expired, refunded)
3. Backend updates `users.isPremium` — source of truth is backend, not client
4. 7-day free trial managed by RevenueCat/App Store — no custom logic needed

---

## 5. Deep Links

### Library
**Expo Universal Links** (built-in, no third-party dependency).

URLs use `https://mockket.app/...` scheme — configured via `app.json` with `intentFilters` (Android) and `associatedDomains` (iOS).

### Link Targets
| URL | Opens |
|---|---|
| `https://mockket.app/recommendation/{id}` | RecommendationScreen |
| `https://mockket.app/challenge/{token}` | ChallengeInviteScreen |

### Deferred Deep Links
Not supported in MVP. If a user taps an invite link without the app installed, they are sent to the App Store / Play Store. After install, they land on Home — not the challenge screen. Acceptable for MVP; Branch.io can be added later if deferred links become a measurable drop-off point.

---

## 6. Agent Interface

### Updated Interface (adds `preview()`)
```typescript
interface Agent {
  id: string;
  name: string;
  shortName: string;
  strategy: string;
  riskLevel: "low" | "medium" | "high" | "degen";
  assetClasses: ("stocks" | "crypto")[];
  rebalanceInterval: "daily" | "6h" | "never";

  rebalance(portfolio: Portfolio, marketData: MarketData): Promise<Trade[]>;
  getRationale(trade: Trade): string;        // in-character log entry
  react(userTrade: Trade): string;           // post-trade reaction (max 1/day)
  preview(proposed: ProposedTrade): string;  // pre-trade "what would I do?" response
}

interface ProposedTrade {
  ticker: string;
  action: "buy" | "sell";
  quantity: number;
  estimatedValue: number;   // quantity * current price
  portfolioValue: number;   // user's total portfolio value at time of request
}
```

`preview()` is called on-demand from the trade confirmation screen when user taps "Ask [Agent]". It does not count against the advisory recommendation daily limit.

---

## 7. Glossary System

### Implementation
- Static dictionary of ~15 terms defined client-side
- On render, agent rationale strings are scanned for exact term matches
- Matches are wrapped in a tappable `<GlossaryTerm>` component
- Tap shows a 2-sentence tooltip inline — no navigation away from current screen
- No server-side markup required

### Terms Covered (MVP)
bid/ask spread, P/E ratio, market cap, day trade, dividend, ex-dividend date, earnings per share, moving average, RSI, MACD, Sharpe ratio, max drawdown, beta, sector exposure, short selling

---

## 8. Minor PRD Fixes

- **Duplicate paragraph:** Remove the second "V2 adds crypto, The Degen..." paragraph at the end of PRD.md
- **Morning briefs:** Fire at 9:15am ET for all users. No per-user timezone handling — ET is the market timezone and the natural reference for all users. Stock-only agents skip weekends.
- **"What would [Agent] do?":** Implemented via the new `preview()` method on the Agent interface. Rule-based, not ML. Response does not change whether the user proceeds with the trade.
