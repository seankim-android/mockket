# AGENTS.md — Mockket Agent Execution Guide

This is the primary reference for any AI agent or engineer working in this repo. Read this before touching any code.

---

## Repo at a Glance

Mockket is a mobile paper trading app where users invest fake money in real markets, hire AI trading agents, and compete in challenges. Turborepo monorepo.

| Path | What it is |
|---|---|
| `apps/mobile/` | React Native (Expo + Expo Router) mobile app |
| `packages/shared/` | Shared TypeScript types used by all packages |
| `packages/agents/` | AI trading agent modules (one file per agent) |
| `packages/api/` | Node.js backend: REST, WebSocket streaming, cron jobs |

---

## Essential Commands

```bash
# Dev — starts all packages in watch mode
npm run dev

# Typecheck — validates TypeScript across all packages
npm run typecheck

# Build — production build of all packages
npm run build

# Lint
npm run lint

# Run a command in a single package
npx turbo run typecheck --filter=@mockket/shared
npx turbo run dev --filter=mobile
```

All commands are Turborepo tasks. See `turbo.json` for the task graph.

---

## Where Things Live

| What | Path |
|---|---|
| Tab screens | `apps/mobile/app/(tabs)/` |
| Screen routes | `apps/mobile/app/` |
| Feature modules | `apps/mobile/src/features/<feature>/` |
| Feature hooks | `apps/mobile/src/features/<feature>/hooks/` |
| Feature components | `apps/mobile/src/features/<feature>/components/` |
| Shared UI components | `apps/mobile/src/components/ui/` |
| Domain components | `apps/mobile/src/components/domain/` |
| Primitive components | `apps/mobile/src/components/primitives/` |
| Design tokens | `apps/mobile/src/design/tokens/` |
| Query keys | `apps/mobile/src/lib/query/keys.ts` |
| WebSocket client | `apps/mobile/src/lib/ws/client.ts` |
| API client | `apps/mobile/src/lib/api/client.ts` |
| Shared types | `packages/shared/src/types/` |
| Agent modules | `packages/agents/src/<agent-slug>/` |
| Agent types | `packages/agents/src/types.ts` |
| Backend entry | `packages/api/src/index.ts` |

---

## Key Patterns

### 1. Feature Boundary Rule

Features are isolated modules. A feature can only import from:
- `@mockket/shared` (shared types)
- `@/components/` (primitives, ui, domain)
- `@/lib/` (query, ws, api clients)
- `@/design/` (tokens)

A feature must **never** import from a sibling feature.

```typescript
// CORRECT — feature imports from shared layers
import type { Trade } from '@mockket/shared'
import { queryKeys } from '@/lib/query/keys'
import { Box } from '@/components/primitives'

// WRONG — feature imports from sibling feature
import { usePortfolio } from '@/features/portfolio/hooks/usePortfolio'
```

### 2. Query Key Factory

All query keys live in `apps/mobile/src/lib/query/keys.ts`. Never use raw string arrays.

```typescript
import { queryKeys } from '@/lib/query/keys'

// CORRECT
useQuery({ queryKey: queryKeys.portfolio(userId), queryFn: fetchPortfolio })

// WRONG — raw string array
useQuery({ queryKey: ['portfolio', userId], queryFn: fetchPortfolio })
```

### 3. WebSocket Price Bridge

Live prices flow from the WebSocket into TanStack Query cache. The `usePrice()` hook reads from cache with `staleTime: Infinity` — it never fetches on its own.

```typescript
// In lib/ws/client.ts — WS message handler bridges into cache:
queryClient.setQueryData(queryKeys.price(msg.ticker), msg.price)

// In components — read cached price:
import { usePrice } from '@/features/markets'

function PriceDisplay({ ticker }: { ticker: string }) {
  const { data: price } = usePrice(ticker)
  return <Text variant="mono">{price}</Text>
}
```

### 4. Token-Only Styling

Never use raw color, spacing, or font values. Always use tokens.

```typescript
import { colors, spacing, fontSize } from '@/design/tokens'

// CORRECT
{ backgroundColor: colors.bg.primary, padding: spacing[4] }

// WRONG — raw values
{ backgroundColor: '#0F172A', padding: 16 }
```

### 5. Agent Module Interface

Every agent exports a const satisfying `AgentModule` from `packages/agents/src/types.ts`:

```typescript
import type { AgentModule } from '../types'

export const myAgent: AgentModule = {
  id: 'my-agent',
  name: 'My Agent',
  shortName: 'Agent',
  strategy: 'One-line description of the trading strategy.',
  riskLevel: 'medium',
  assetClasses: ['stocks'],
  rebalanceInterval: 'daily',

  async rebalance(portfolio, marketData) { /* ... */ return [] },
  getRationale(trade) { return `In-character rationale for ${trade.ticker}.` },
  react(userTrade) { return `In-character reaction to ${userTrade.ticker}.` },
}
```

---

## Rules That Must Never Be Broken

- **Trade history is permanent.** Never delete trade records, even on portfolio reset.
- **Agent logs must include:** timestamp, ticker, action (buy/sell), quantity, price at execution, and in-character rationale string.
- **Challenge history is permanent.** Resets do not affect challenge records.
- **Advisory recommendation rationale is hidden** until after the user acts on the recommendation. It must not be shown on the approval screen.
- **Portfolio resets never delete history.** A reset sets cash back to $100,000, pauses all agent hires, and increments `resetCount`. Trade history, challenge history, and agent logs are untouched.
- **No shared state between agents.** Each agent module is fully isolated.
- **Feature modules never import from sibling features.**
- **Never use raw color/spacing/font values.** Always use design tokens.
- **Never use raw query key arrays.** Always use `queryKeys.*` from `@/lib/query/keys.ts`.

---

## Package-Specific Guides

- [Agent modules](packages/agents/AGENTS.md) — how to write and add agents
- [API backend](packages/api/AGENTS.md) — server architecture, WebSocket, cron jobs
- [Mobile app](apps/mobile/AGENTS.md) — Expo Router conventions, state management, UI patterns
