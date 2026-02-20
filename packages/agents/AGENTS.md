# AGENTS.md — Agent Package Guide (`packages/agents/`)

---

## What This Package Is

This package contains isolated AI trading agent modules. Each agent is a self-contained module that exports a const satisfying the `AgentModule` interface. Agents are called by the backend cron job to rebalance portfolios on schedule.

There is no shared state between agents. Each agent makes independent decisions based on the portfolio and market data passed to it. Adding a new agent requires zero changes to existing agent code.

---

## The AgentModule Interface

Defined in `packages/agents/src/types.ts`:

```typescript
import type { Trade, AgentMeta } from '@mockket/shared'

export interface Portfolio {
  cash: number
  holdings: Array<{
    ticker: string
    quantity: number
    currentPrice: number
  }>
}

export interface MarketData {
  prices: Record<string, number>
  timestamp: string
}

export interface AgentModule extends AgentMeta {
  rebalance(portfolio: Portfolio, marketData: MarketData): Promise<Trade[]>
  getRationale(trade: Trade): string
  react(userTrade: Trade): string
}
```

`AgentMeta` is defined in `packages/shared/src/types/agent.ts`:

```typescript
export interface AgentMeta {
  id: string                          // unique slug, e.g. "marcus-bull-chen"
  name: string                        // display name, e.g. 'Marcus "The Bull" Chen'
  shortName: string                   // e.g. "Marcus"
  strategy: string                    // one-line strategy description
  riskLevel: 'low' | 'medium' | 'high' | 'degen'
  assetClasses: ('stocks' | 'crypto')[]
  rebalanceInterval: 'daily' | '6h' | 'never'
}
```

---

## How to Add a New Agent

### Step 1: Create the agent directory and file

```
packages/agents/src/<agent-slug>/index.ts
```

The slug must be kebab-case and match the agent's `id` field. Example: `hodl-hannah`.

### Step 2: Export a const satisfying AgentModule

```typescript
// packages/agents/src/hodl-hannah/index.ts
import type { Trade } from '@mockket/shared'
import type { AgentModule, Portfolio, MarketData } from '../types'

export const hodlHannah: AgentModule = {
  id: 'hodl-hannah',
  name: 'HODL Hannah',
  shortName: 'Hannah',
  strategy: 'Diamond hands. Buys crypto and never sells.',
  riskLevel: 'medium',
  assetClasses: ['crypto'],
  rebalanceInterval: 'never',

  async rebalance(_portfolio: Portfolio, _marketData: MarketData): Promise<Trade[]> {
    // Hannah never rebalances — she HODLs
    return []
  },

  getRationale(trade: Trade): string {
    return `Added more ${trade.ticker} to the bag. We're not here for a quick flip.`
  },

  react(userTrade: Trade): string {
    return `Selling ${userTrade.ticker}? Paper hands detected.`
  },
}
```

### Step 3: Add export to the package barrel

Edit `packages/agents/src/index.ts`:

```typescript
export { hodlHannah } from './hodl-hannah'
```

### Step 4: Register the agent

Currently, agents are discovered via their named exports from the package barrel. A formal registry is planned for the future. For now, the backend imports all agents from `@mockket/agents` and iterates over them for cron scheduling.

---

## Rules for Agent Implementation

### `rebalance()` must be idempotent

Given the same `portfolio` and `marketData` inputs, `rebalance()` must produce the same output. No external side effects, no randomness, no reliance on global state. The cron job may retry on failure.

### `getRationale()` must be in-character

The rationale is displayed in the user's trade log. It must be written in first person from the agent's perspective, consistent with their personality. Keep it 1-2 sentences.

```typescript
// Marcus (aggressive momentum trader)
getRationale(trade) {
  return `Volume spike on $${trade.ticker}, classic breakout setup, went in heavy.`
}

// Priya (calm value investor)
getRationale(trade) {
  return `P/E came down to an attractive entry point after the pullback, initiated a position in $${trade.ticker}.`
}
```

### `react()` must be in-character, max ~100 characters

Reactions are triggered when a user makes a trade worth more than 5% of their portfolio value. Max 1 reaction per agent per day. Keep it short and punchy.

```typescript
react(userTrade) {
  return `Bold move on $${userTrade.ticker}. Let's see if you can keep up.`
}
```

### No shared state between agents

Each agent module is fully isolated. No global variables, no shared singletons, no cross-agent imports. If two agents need the same utility function, it should be in `packages/shared/`.

### Asset class and schedule rules

- Stock-only agents: `assetClasses: ['stocks']`
- Crypto-only agents: `assetClasses: ['crypto']`
- Mixed agents: `assetClasses: ['stocks', 'crypto']`
- Daily rebalance (stocks): `rebalanceInterval: 'daily'` (runs at market open)
- 6-hour rebalance (crypto): `rebalanceInterval: '6h'` (runs 24/7)
- Never rebalance: `rebalanceInterval: 'never'`

Stock-only agents that never trade on weekends should send one in-character Saturday commentary message instead (handled by the backend cron, not the agent module itself).

---

## V1 Agents (MVP)

| Slug | Name | Strategy | Risk | Assets | Schedule |
|---|---|---|---|---|---|
| `marcus-bull-chen` | Marcus "The Bull" Chen | Momentum trader chasing high-volume breakouts | high | stocks, crypto | daily |
| `priya-sharma` | Priya Sharma | Value investor, Buffett-style fundamentals, long holds | low | stocks | daily |

---

## V2 Agents (Planned)

| Slug | Name | Strategy | Risk | Assets | Schedule |
|---|---|---|---|---|---|
| `hodl-hannah` | HODL Hannah | Crypto only, buys and never sells | medium | crypto | never |
| `the-quant` | The Quant | Technical indicators, algorithmic signals | medium | stocks, crypto | 6h |
| `the-degen` | The Degen | Altcoins and memecoins, high risk, high reward | degen | crypto | 6h |
| `elena-steady-park` | Elena "Steady" Park | Dividend focus, stable stocks, low turnover | low | stocks | daily |
