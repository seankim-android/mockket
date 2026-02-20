# CONTRIBUTING.md — Mockket Contribution Conventions

---

## File Naming Rules

| Type | Convention | Example |
|---|---|---|
| Component files | `PascalCase.tsx` | `Button.tsx`, `PortfolioCard.tsx` |
| Hook files | `useCamelCase.ts` | `usePortfolio.ts`, `usePrice.ts` |
| Store files | `store.ts` (one per feature) | `features/auth/store.ts` |
| Utility files | `kebab-case.ts` | `format-currency.ts`, `parse-date.ts` |
| Type files | `kebab-case.ts` | `user.ts`, `trade.ts` |
| Index files | `index.ts` | Every feature and component directory has one |
| All directories | `kebab-case/` | `marcus-bull-chen/`, `query-keys/` |

---

## Import Order

Imports should follow this order, separated by blank lines between groups:

```typescript
// 1. React / React Native
import { useState } from 'react'
import { View, Pressable } from 'react-native'

// 2. Third-party libraries
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { create } from 'zustand'

// 3. Internal packages (workspace)
import type { Trade, User } from '@mockket/shared'

// 4. App-internal (@ alias)
import { queryKeys } from '@/lib/query/keys'
import { colors, spacing } from '@/design/tokens'
import { Box, Text, Stack } from '@/components/primitives'

// 5. Relative imports (same feature/directory)
import { TradeRow } from './TradeRow'
import type { FormState } from './types'
```

---

## Component Structure

Every component file follows this order:

```typescript
// 1. Imports (following import order above)
import { View } from 'react-native'
import { Text, Stack } from '@/components/primitives'
import { colors, spacing } from '@/design/tokens'

// 2. Props interface
interface TradeRowProps {
  ticker: string
  action: 'buy' | 'sell'
  quantity: number
  price: number
}

// 3. Component function (named export, not default)
export function TradeRow({ ticker, action, quantity, price }: TradeRowProps) {
  return (
    <Stack direction="row" gap={3} align="center">
      <Text variant="mono">{ticker}</Text>
      <Text color={action === 'buy' ? 'primary' : 'secondary'}>{action}</Text>
      <Text variant="mono">{quantity} @ ${price}</Text>
    </Stack>
  )
}

// 4. Styles (if needed, defined after the component)
// Use StyleSheet.create or inline objects with tokens
```

Rules:
- Use **named exports**, not default exports (exception: route files in `app/` which must use `export default`).
- Props interface is defined in the same file, directly above the component.
- One component per file. Helper sub-components that are only used by the main component can live in the same file.

---

## Feature Module Rules

Each feature lives in `apps/mobile/src/features/<feature-name>/` with this structure:

```
features/
  portfolio/
    hooks/
      usePortfolio.ts
    components/
      PortfolioSummary.tsx
    store.ts          # Zustand store (if feature has client state)
    index.ts          # Public API — re-exports everything consumed outside the feature
```

### Isolation Rules

1. **Features never import from sibling features.** If two features need to share logic, extract it to `@/lib/` or `@/components/`.
2. **Every feature exports through its `index.ts`.** External consumers import from the feature barrel, not from internal paths.
3. **Hooks** go in `hooks/` subdirectory.
4. **Components** go in `components/` subdirectory.
5. **Zustand store** is a single `store.ts` file at the feature root.

```typescript
// CORRECT — importing from feature barrel
import { usePortfolio } from '@/features/portfolio'

// WRONG — reaching into feature internals
import { usePortfolio } from '@/features/portfolio/hooks/usePortfolio'
```

---

## Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short description>

[optional body]
```

### Types

| Type | When to use |
|---|---|
| `feat:` | New feature or capability |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `refactor:` | Code change that neither fixes a bug nor adds a feature |
| `chore:` | Build config, dependencies, tooling |
| `test:` | Adding or updating tests |
| `style:` | Formatting, whitespace (no logic change) |

### Examples

```
feat: add portfolio reset flow with IAP confirmation
fix: prevent challenge creation when balance below minimum
docs: add agent module implementation guide
refactor: extract price formatting to shared utility
chore: upgrade expo-router to v4
```

---

## Adding a New Screen

### Step 1: Create the route file

Add a file in `apps/mobile/app/` in the correct segment:

- Tab screen: `app/(tabs)/my-screen.tsx`
- Modal/push screen: `app/my-screen.tsx`
- Dynamic route: `app/agent/[agentId].tsx`

Route files must use `export default`:

```typescript
import { MyScreenContent } from '@/features/my-feature'

export default function MyScreen() {
  return <MyScreenContent />
}
```

### Step 2: Add to tab layout (if it is a tab)

Edit `app/(tabs)/_layout.tsx`:

```typescript
<Tabs.Screen name="my-screen" options={{ title: 'My Screen' }} />
```

### Step 3: Create feature hooks and components

Add files in `src/features/my-feature/`:
- `hooks/useMyData.ts` — TanStack Query hook
- `components/MyComponent.tsx` — UI component
- `store.ts` — Zustand store (if needed)
- `index.ts` — barrel export

### Step 4: Export from feature index

```typescript
// features/my-feature/index.ts
export { useMyData } from './hooks/useMyData'
export { MyComponent } from './components/MyComponent'
```

---

## TypeScript Rules

- **No `any`.** Use `unknown` for untyped external data, then narrow with type guards or validation.
- **All API responses must be typed.** Define response types in `packages/shared/src/types/` and import them.
- **Prefer `interface` over `type`** for object shapes (interfaces are extendable and produce better error messages).
- **Use `type` for unions and aliases**: `type TradeAction = 'buy' | 'sell'`
- **Mark optional props explicitly**: `price?: number`, not `price: number | undefined`.
- **Import types with `import type`** when only using them for type checking:

```typescript
import type { Trade } from '@mockket/shared'
```

- **No type assertions (`as`)** unless absolutely necessary and documented with a comment explaining why.
- **No non-null assertions (`!`)** — handle null/undefined explicitly.
