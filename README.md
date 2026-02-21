# Mockket

Paper trading app where users invest fake money in real markets and compete against or hire AI trading agents. Each agent has a name, personality, and real performance history. Users can trade manually, let agents run on autopilot, or get trade recommendations from agents in advisory mode.

---

## What it does

- **Paper trading** — real market prices (Alpaca), virtual cash ledger, bid/ask spread execution
- **AI agents** — Marcus Bull Chen (momentum) and Priya Sharma (value) trade on your behalf or give you recommendations
- **Challenges** — compete against agents or friends over 1 week, 1 month, or 3 months
- **Leaderboard** — top 50 by all-time return (opt-in)
- **FTUE** — guided first-time experience: meet Marcus, make a trade, start a challenge
- **Portfolio reset** — $0.99 IAP to reset cash to $100,000 (history is always preserved)

---

## Stack

| Layer | Tech |
|---|---|
| Mobile | React Native (Expo + Expo Router) |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL |
| Cache / pub-sub | Redis |
| Auth | Supabase Auth (email + Apple + Google) |
| Real-time prices | Alpaca Markets WebSocket |
| Market data | Polygon.io (dividends, earnings, splits) |
| Push notifications | Firebase Cloud Messaging (HTTP v1) |
| IAP | RevenueCat |
| Monorepo | Turborepo |

---

## Repo structure

```
apps/
  mobile/              React Native app (Expo Router)
packages/
  api/                 Node.js backend — REST, WebSocket, cron jobs
  agents/              AI trading agent modules (one file per agent)
  shared/              Shared TypeScript types
```

---

## Getting started

### Prerequisites

- Node.js 20+
- npm 10+
- A running Postgres instance
- A running Redis instance

### Install

```bash
npm install
```

### Environment variables

Copy and fill in all required variables:

```bash
cp SETUP.md .env.example   # use SETUP.md as the reference
```

See `SETUP.md` for the full variable list with descriptions.

### Run in development

```bash
npm run dev
```

This starts all packages in watch mode via Turborepo:
- API on `http://localhost:3000`
- Metro bundler for the mobile app

### Typecheck

```bash
npm run typecheck
```

### Lint

```bash
npm run lint
```

### Tests

```bash
cd packages/api && npm test
```

---

## Key docs

| File | What it covers |
|---|---|
| `CLAUDE.md` | Product rules, data models, architecture decisions, MVP checklist |
| `PRD.md` | Full product spec and feature details |
| `ARCHITECTURE.md` | System architecture, data flow, env var reference |
| `SETUP.md` | Environment variable list |
| `LAUNCH.md` | Pre-launch checklist — migrations, external services, smoke test, app store |
| `CONTRIBUTING.md` | Coding conventions, commit format, TypeScript rules |
| `DESIGN_SYSTEM.md` | Design tokens, component patterns, visual style |
| `AGENTS.md` | AI agent guide for working in this repo |

---

## Adding a new trading agent

1. Create `packages/agents/src/<agent-slug>/index.ts` exporting a const that satisfies `AgentModule` from `packages/agents/src/types.ts`
2. Export it from `packages/agents/src/index.ts`
3. Register it in `packages/api/src/cron/agent-rebalance.ts` and `generate-recommendations.ts`

See `packages/agents/AGENTS.md` for the full guide.

---

## API endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/users` | Create user profile after signup |
| `GET` | `/users/me` | Current user profile |
| `GET` | `/users/ftue` | FTUE progress |
| `PATCH` | `/users/ftue` | Update FTUE progress |
| `POST` | `/trades` | Execute a paper trade |
| `GET` | `/trades` | Trade history (cursor-paginated) |
| `GET` | `/portfolio` | Portfolio summary (cash + holdings + P&L) |
| `GET` | `/agent-hires` | List hired agents |
| `POST` | `/agent-hires` | Hire an agent |
| `GET` | `/recommendations` | Pending advisory recommendations |
| `PATCH` | `/recommendations/:id` | Approve or reject a recommendation |
| `GET` | `/challenges` | List challenges |
| `POST` | `/challenges` | Start a new challenge |
| `GET` | `/challenges/leaderboard` | Top 50 leaderboard |
| `GET` | `/config/market-status` | Current market status (open/closed/pre-market/after-hours) |
| `GET` | `/config/earnings` | Upcoming earnings dates for given tickers |
| `POST` | `/webhooks/revenuecat` | RevenueCat IAP webhook |
| `WS` | `/?token=<jwt>` | WebSocket price feed |

---

## License

Private — all rights reserved.
