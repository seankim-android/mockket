# AGENTS.md — Mobile App Guide (`apps/mobile/`)

---

## Expo Router Conventions

This app uses [Expo Router](https://docs.expo.dev/router/introduction/) for file-based routing.

### Core rules

- **File = route.** Every `.tsx` file in `app/` becomes a screen.
- **Groups in parentheses** do not appear in the URL: `app/(tabs)/` defines tab screens, but the URL is just `/markets`, not `/(tabs)/markets`.
- **`_layout.tsx`** defines the navigator for its directory segment. The root `app/_layout.tsx` wraps the whole app. `app/(tabs)/_layout.tsx` defines the tab bar.
- **Dynamic routes** use brackets: `app/agent/[agentId].tsx`. Access params with `useLocalSearchParams<{ agentId: string }>()`.
- **Route files must use `export default`** (this is an Expo Router requirement, unlike the rest of the codebase which uses named exports).

### Current tab screens

Defined in `app/(tabs)/_layout.tsx`:

| File | Tab title | Purpose |
|---|---|---|
| `app/(tabs)/index.tsx` | Home | Dashboard / overview |
| `app/(tabs)/markets.tsx` | Markets | Price lists, search, watchlist |
| `app/(tabs)/portfolio.tsx` | Portfolio | Holdings, cash balance, P&L |
| `app/(tabs)/agents.tsx` | Agents | Agent list, hire, manage |
| `app/(tabs)/challenges.tsx` | Challenges | Active/past challenges |

---

## Where to Put Things

| What you are building | Where it goes |
|---|---|
| New tab screen | `app/(tabs)/my-screen.tsx` + add `Tabs.Screen` to `app/(tabs)/_layout.tsx` |
| New push/modal screen | `app/my-screen.tsx` or `app/my-feature/[param].tsx` |
| Business logic / data hook | `src/features/<feature>/hooks/useMyHook.ts` |
| UI component for a feature | `src/features/<feature>/components/MyComponent.tsx` |
| Shared UI component (reusable across features) | `src/components/ui/MyComponent.tsx` |
| Domain component (business-specific, reusable) | `src/components/domain/MyComponent.tsx` |
| Zustand store (client state) | `src/features/<feature>/store.ts` |
| New query key | Add to `src/lib/query/keys.ts` |
| New API call | `src/lib/api/client.ts` (add function) |
| Design tokens | `src/design/tokens/` (rarely needed, tokens are stable) |

---

## State Rules

### Server data -> TanStack Query

All data that comes from the API goes through TanStack Query hooks in the feature's `hooks/` directory.

```typescript
// features/portfolio/hooks/usePortfolio.ts
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { api } from '@/lib/api/client'

export function usePortfolio(userId: string) {
  return useQuery({
    queryKey: queryKeys.portfolio(userId),
    queryFn: () => api.getPortfolio(userId),
  })
}
```

**Always use `queryKeys.*` from `@/lib/query/keys.ts`.** Never pass raw string arrays to `queryKey`.

### Client/UI state -> Zustand

UI-only state (modal open/close, form state, selected filters) goes in a Zustand store scoped to the feature.

```typescript
// features/auth/store.ts
import { create } from 'zustand'
import type { User } from '@mockket/shared'

interface AuthState {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  setAuth: (user, token) => set({ user, token }),
  clearAuth: () => set({ user: null, token: null }),
}))
```

### Live prices -> WebSocket bridge (special case)

Live prices are NOT fetched via REST. They are pushed by the WebSocket server and bridged into TanStack Query cache by the WS client (`src/lib/ws/client.ts`).

To read a live price in a component:

```typescript
import { usePrice } from '@/features/markets'

function MyComponent() {
  const { data: price } = usePrice('AAPL')
  // price updates automatically when the WS pushes a new value
}
```

`usePrice()` uses `staleTime: Infinity` — it never triggers a fetch. It reads whatever the WebSocket client last wrote into the cache.

---

## Path Aliases

The `@/` alias maps to `apps/mobile/src/`. Use it for all intra-app imports.

```typescript
// CORRECT
import { queryKeys } from '@/lib/query/keys'
import { Box, Text } from '@/components/primitives'
import { colors } from '@/design/tokens'

// WRONG — relative paths climbing out of the current directory
import { queryKeys } from '../../../lib/query/keys'
```

---

## Adding a New Tab

1. Create the screen file at `app/(tabs)/my-tab.tsx`:

```typescript
import { MyTabContent } from '@/features/my-feature'

export default function MyTabScreen() {
  return <MyTabContent />
}
```

2. Add the `Tabs.Screen` entry in `app/(tabs)/_layout.tsx`:

```typescript
<Tabs>
  {/* existing screens */}
  <Tabs.Screen name="my-tab" options={{ title: 'My Tab' }} />
</Tabs>
```

3. Create the feature module at `src/features/my-feature/` with hooks, components, and an `index.ts` barrel export.

---

## Design Token Rule

Import tokens from `@/design/tokens`. Never use raw numeric or hex values for colors, spacing, font sizes, or border radii.

```typescript
import { colors, spacing, radii } from '@/design/tokens'

// CORRECT
const styles = {
  container: {
    backgroundColor: colors.bg.surface,
    padding: spacing[4],
    borderRadius: radii.md,
    borderColor: colors.border.default,
  },
}

// WRONG
const styles = {
  container: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 8,
    borderColor: '#334155',
  },
}
```

For text, use the `Text` primitive with `variant` and `color` props instead of manual font styling:

```typescript
// CORRECT
<Text variant="heading" color="primary">Portfolio</Text>

// WRONG
<RNText style={{ fontSize: 24, fontWeight: '600', color: '#FFFFFF' }}>Portfolio</RNText>
```
