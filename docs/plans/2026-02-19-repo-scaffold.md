# Mockket Repo Scaffold Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Scaffold the full Mockket monorepo structure with design system, architecture docs, AGENTS.md files, and token/component stubs — creating a clean, agent-friendly foundation for all future development.

**Architecture:** Turborepo monorepo with Expo + Expo Router mobile app, Node.js API, shared types package, and isolated agent modules. Feature-scoped vertical slices inside the mobile app. TanStack Query for server state, Zustand for client state. Custom design system with token → primitive → ui → domain hierarchy.

**Tech Stack:** Expo SDK, Expo Router, TanStack Query, Zustand, TypeScript, Turborepo, Node.js, Postgres, Redis.

---

## Task 1: Root workspace config

**Files:**
- Create: `package.json`
- Create: `turbo.json`
- Create: `tsconfig.base.json`

**Step 1: Create root package.json**

```json
{
  "name": "mockket",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  }
}
```

**Step 2: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".expo/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

**Step 3: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "jsx": "react-native",
    "paths": {}
  }
}
```

**Step 4: Commit**

```bash
git add package.json turbo.json tsconfig.base.json
git commit -m "feat: add root workspace and turborepo config"
```

---

## Task 2: Shared types package

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/types/index.ts`
- Create: `packages/shared/src/types/user.ts`
- Create: `packages/shared/src/types/trade.ts`
- Create: `packages/shared/src/types/agent.ts`
- Create: `packages/shared/src/types/challenge.ts`
- Create: `packages/shared/src/types/recommendation.ts`
- Create: `packages/shared/src/index.ts`

**Step 1: Create packages/shared/package.json**

```json
{
  "name": "@mockket/shared",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

**Step 2: Create packages/shared/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}
```

**Step 3: Create packages/shared/src/types/user.ts**

```typescript
export interface User {
  id: string
  email: string
  displayName: string
  isPremium: boolean
  portfolioCash: number
  resetCount: number
  leaderboardOptIn: boolean
  createdAt: string
  updatedAt: string
}
```

**Step 4: Create packages/shared/src/types/trade.ts**

```typescript
export type TradeAction = 'buy' | 'sell'

export interface Trade {
  id: string
  userId: string
  agentId: string | null
  ticker: string
  action: TradeAction
  quantity: number
  priceAtExecution: number
  rationale: string
  challengeId: string | null
  executedAt: string
}
```

**Step 5: Create packages/shared/src/types/agent.ts**

```typescript
export type RiskLevel = 'low' | 'medium' | 'high' | 'degen'
export type AssetClass = 'stocks' | 'crypto'
export type RebalanceInterval = 'daily' | '6h' | 'never'
export type AgentMode = 'advisory' | 'autopilot'

export interface AgentMeta {
  id: string
  name: string
  shortName: string
  strategy: string
  riskLevel: RiskLevel
  assetClasses: AssetClass[]
  rebalanceInterval: RebalanceInterval
}

export interface AgentHire {
  id: string
  userId: string
  agentId: string
  allocatedCash: number
  mode: AgentMode
  isActive: boolean
  isPaused: boolean
  hiredAt: string
  pausedAt: string | null
}
```

**Step 6: Create packages/shared/src/types/challenge.ts**

```typescript
export type ChallengeDuration = '1w' | '1m' | '3m'
export type ChallengeStatus = 'active' | 'completed' | 'forfeited'

export interface Challenge {
  id: string
  userId: string
  agentId: string | null
  opponentUserId: string | null
  duration: ChallengeDuration
  startingBalance: number
  status: ChallengeStatus
  isForfeited: boolean
  startedAt: string
  endsAt: string
  completedAt: string | null
  winnerId: string | null
}
```

**Step 7: Create packages/shared/src/types/recommendation.ts**

```typescript
export type RecommendationStatus = 'pending' | 'approved' | 'rejected' | 'expired'

export interface AgentRecommendation {
  id: string
  userId: string
  agentId: string
  challengeId: string | null
  ticker: string
  action: 'buy' | 'sell'
  quantity: number
  rationale: string
  status: RecommendationStatus
  createdAt: string
  expiresAt: string
  actedAt: string | null
}
```

**Step 8: Create packages/shared/src/types/index.ts**

```typescript
export * from './user'
export * from './trade'
export * from './agent'
export * from './challenge'
export * from './recommendation'
```

**Step 9: Create packages/shared/src/index.ts**

```typescript
export * from './types'
```

**Step 10: Commit**

```bash
git add packages/shared/
git commit -m "feat: add shared types package (User, Trade, Agent, Challenge, Recommendation)"
```

---

## Task 3: Agents package scaffold

**Files:**
- Create: `packages/agents/package.json`
- Create: `packages/agents/tsconfig.json`
- Create: `packages/agents/src/types.ts`
- Create: `packages/agents/src/marcus-bull-chen/index.ts`
- Create: `packages/agents/src/priya-sharma/index.ts`
- Create: `packages/agents/src/index.ts`
- Create: `packages/agents/AGENTS.md`

**Step 1: Create packages/agents/package.json**

```json
{
  "name": "@mockket/agents",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@mockket/shared": "*"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

**Step 2: Create packages/agents/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}
```

**Step 3: Create packages/agents/src/types.ts**

```typescript
import type { Trade, AgentMeta, RiskLevel, AssetClass, RebalanceInterval } from '@mockket/shared'

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

**Step 4: Create packages/agents/src/marcus-bull-chen/index.ts**

```typescript
import type { Trade } from '@mockket/shared'
import type { AgentModule, Portfolio, MarketData } from '../types'

export const marcusBullChen: AgentModule = {
  id: 'marcus-bull-chen',
  name: 'Marcus "The Bull" Chen',
  shortName: 'Marcus',
  strategy: 'Momentum trader chasing high-volume breakouts in stocks and crypto.',
  riskLevel: 'high',
  assetClasses: ['stocks', 'crypto'],
  rebalanceInterval: 'daily',

  async rebalance(_portfolio: Portfolio, _marketData: MarketData): Promise<Trade[]> {
    // TODO: implement momentum strategy
    return []
  },

  getRationale(trade: Trade): string {
    return `Volume spike on $${trade.ticker}, classic breakout setup, went in heavy.`
  },

  react(userTrade: Trade): string {
    return `Bold move on $${userTrade.ticker}. Let's see if you can keep up.`
  },
}
```

**Step 5: Create packages/agents/src/priya-sharma/index.ts**

```typescript
import type { Trade } from '@mockket/shared'
import type { AgentModule, Portfolio, MarketData } from '../types'

export const priyaSharma: AgentModule = {
  id: 'priya-sharma',
  name: 'Priya Sharma',
  shortName: 'Priya',
  strategy: 'Value investor. Buffett-style fundamentals, long holds, low turnover.',
  riskLevel: 'low',
  assetClasses: ['stocks'],
  rebalanceInterval: 'daily',

  async rebalance(_portfolio: Portfolio, _marketData: MarketData): Promise<Trade[]> {
    // TODO: implement value strategy
    return []
  },

  getRationale(trade: Trade): string {
    return `P/E came down to an attractive entry point after the pullback, initiated a position in $${trade.ticker}.`
  },

  react(userTrade: Trade): string {
    return `I wouldn't have done that on $${userTrade.ticker}, but I respect the conviction.`
  },
}
```

**Step 6: Create packages/agents/src/index.ts**

```typescript
export * from './types'
export { marcusBullChen } from './marcus-bull-chen'
export { priyaSharma } from './priya-sharma'
```

**Step 7: Commit**

```bash
git add packages/agents/
git commit -m "feat: add agents package with Marcus and Priya stubs"
```

---

## Task 4: API package scaffold

**Files:**
- Create: `packages/api/package.json`
- Create: `packages/api/tsconfig.json`
- Create: `packages/api/src/index.ts`
- Create: `packages/api/src/routes/.gitkeep`
- Create: `packages/api/src/ws/.gitkeep`
- Create: `packages/api/src/cron/.gitkeep`
- Create: `packages/api/src/db/.gitkeep`
- Create: `packages/api/src/middleware/.gitkeep`
- Create: `packages/api/AGENTS.md`

**Step 1: Create packages/api/package.json**

```json
{
  "name": "@mockket/api",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "scripts": {
    "dev": "ts-node src/index.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@mockket/shared": "*",
    "@mockket/agents": "*"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "ts-node": "^10.9.0"
  }
}
```

**Step 2: Create packages/api/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "commonjs",
    "outDir": "dist",
    "target": "ES2022"
  },
  "include": ["src"]
}
```

**Step 3: Create packages/api/src/index.ts**

```typescript
// Mockket API server entry point
// See packages/api/AGENTS.md for conventions

const PORT = process.env.PORT ?? 3000

// TODO: initialize Express + WebSocket server
console.log(`Mockket API starting on port ${PORT}`)
```

**Step 4: Commit**

```bash
git add packages/api/
git commit -m "feat: add api package scaffold"
```

---

## Task 5: Mobile app scaffold

**Files:**
- Create: `apps/mobile/package.json`
- Create: `apps/mobile/tsconfig.json`
- Create: `apps/mobile/app.json`
- Create: `apps/mobile/babel.config.js`
- Create: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/app/(auth)/_layout.tsx`
- Create: `apps/mobile/app/(auth)/sign-in.tsx`
- Create: `apps/mobile/app/(tabs)/_layout.tsx`
- Create: `apps/mobile/app/(tabs)/index.tsx`
- Create: `apps/mobile/app/(tabs)/markets.tsx`
- Create: `apps/mobile/app/(tabs)/portfolio.tsx`
- Create: `apps/mobile/app/(tabs)/agents.tsx`
- Create: `apps/mobile/app/(tabs)/challenges.tsx`
- Create: `apps/mobile/app/agent/[id].tsx`
- Create: `apps/mobile/app/trade/[ticker].tsx`
- Create: `apps/mobile/app/challenge/[id].tsx`
- Create: `apps/mobile/app/recap/[challengeId].tsx`

**Step 1: Create apps/mobile/package.json**

```json
{
  "name": "@mockket/mobile",
  "version": "0.1.0",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "dev": "expo start",
    "build:ios": "eas build --platform ios",
    "build:android": "eas build --platform android",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src app"
  },
  "dependencies": {
    "@mockket/shared": "*",
    "@tanstack/react-query": "^5.0.0",
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "expo-status-bar": "~2.0.0",
    "react": "18.3.2",
    "react-native": "0.76.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "~18.3.0",
    "typescript": "^5.4.0"
  }
}
```

**Step 2: Create apps/mobile/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@mockket/shared": ["../../packages/shared/src"]
    }
  },
  "include": ["app", "src", "*.ts", "*.tsx"]
}
```

**Step 3: Create apps/mobile/app.json**

```json
{
  "expo": {
    "name": "Mockket",
    "slug": "mockket",
    "version": "1.0.0",
    "scheme": "mockket",
    "orientation": "portrait",
    "userInterfaceStyle": "automatic",
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.mockket.app"
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#0F172A"
      },
      "package": "com.mockket.app"
    },
    "plugins": [
      "expo-router"
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

**Step 4: Create apps/mobile/babel.config.js**

```javascript
module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
  }
}
```

**Step 5: Create apps/mobile/app/_layout.tsx**

```tsx
import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
    },
  },
})

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  )
}
```

**Step 6: Create apps/mobile/app/(auth)/_layout.tsx**

```tsx
import { Stack } from 'expo-router'

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
```

**Step 7: Create apps/mobile/app/(auth)/sign-in.tsx**

```tsx
import { View, Text } from 'react-native'

export default function SignIn() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Sign In</Text>
    </View>
  )
}
```

**Step 8: Create apps/mobile/app/(tabs)/_layout.tsx**

```tsx
import { Tabs } from 'expo-router'

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="markets" options={{ title: 'Markets' }} />
      <Tabs.Screen name="portfolio" options={{ title: 'Portfolio' }} />
      <Tabs.Screen name="agents" options={{ title: 'Agents' }} />
      <Tabs.Screen name="challenges" options={{ title: 'Challenges' }} />
    </Tabs>
  )
}
```

**Step 9: Create tab screen stubs (home, markets, portfolio, agents, challenges)**

`apps/mobile/app/(tabs)/index.tsx`:
```tsx
import { View, Text } from 'react-native'

export default function Home() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home</Text>
    </View>
  )
}
```

Repeat the same stub pattern for:
- `apps/mobile/app/(tabs)/markets.tsx` — `export default function Markets()`
- `apps/mobile/app/(tabs)/portfolio.tsx` — `export default function Portfolio()`
- `apps/mobile/app/(tabs)/agents.tsx` — `export default function Agents()`
- `apps/mobile/app/(tabs)/challenges.tsx` — `export default function Challenges()`

**Step 10: Create dynamic route stubs**

`apps/mobile/app/agent/[id].tsx`:
```tsx
import { useLocalSearchParams } from 'expo-router'
import { View, Text } from 'react-native'

export default function AgentProfile() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Agent: {id}</Text>
    </View>
  )
}
```

Apply the same pattern for:
- `apps/mobile/app/trade/[ticker].tsx` — param: `ticker`
- `apps/mobile/app/challenge/[id].tsx` — param: `id`
- `apps/mobile/app/recap/[challengeId].tsx` — param: `challengeId`

**Step 11: Commit**

```bash
git add apps/mobile/
git commit -m "feat: scaffold Expo Router app with tab layout and route stubs"
```

---

## Task 6: Design token files

**Files:**
- Create: `apps/mobile/src/design/tokens/colors.ts`
- Create: `apps/mobile/src/design/tokens/typography.ts`
- Create: `apps/mobile/src/design/tokens/spacing.ts`
- Create: `apps/mobile/src/design/tokens/radii.ts`
- Create: `apps/mobile/src/design/tokens/index.ts`

**Step 1: Create colors.ts**

```typescript
// Palette — raw values, do not use directly in components
const palette = {
  // Brand
  emerald50: '#ECFDF5',
  emerald400: '#34D399',
  emerald500: '#10B981',
  emerald600: '#059669',

  // Neutrals
  slate900: '#0F172A',
  slate800: '#1E293B',
  slate700: '#334155',
  slate500: '#64748B',
  slate400: '#94A3B8',
  slate200: '#E2E8F0',
  slate100: '#F1F5F9',
  white: '#FFFFFF',

  // Semantic
  red400: '#F87171',
  red500: '#EF4444',
  amber400: '#FBBF24',
} as const

// Semantic tokens — use these in components
export const colors = {
  // Backgrounds
  bg: {
    primary: palette.slate900,
    secondary: palette.slate800,
    tertiary: palette.slate700,
    surface: palette.slate800,
  },
  // Text
  text: {
    primary: palette.white,
    secondary: palette.slate400,
    muted: palette.slate500,
    inverse: palette.slate900,
  },
  // Brand
  brand: {
    default: palette.emerald500,
    subtle: palette.emerald400,
    muted: palette.emerald50,
  },
  // Semantic
  success: palette.emerald500,
  error: palette.red500,
  warning: palette.amber400,
  // Charts
  positive: palette.emerald400,
  negative: palette.red400,
  // Borders
  border: {
    default: palette.slate700,
    subtle: palette.slate800,
  },
} as const
```

**Step 2: Create typography.ts**

```typescript
export const fontFamily = {
  sans: 'System',        // replaced with custom font in Task 8
  mono: 'Courier',
} as const

// Type scale (in px / RN units)
export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  '2xl': 28,
  '3xl': 34,
  '4xl': 40,
} as const

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const

export const lineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
} as const

export const letterSpacing = {
  tight: -0.5,
  normal: 0,
  wide: 0.5,
  wider: 1,
} as const
```

**Step 3: Create spacing.ts**

```typescript
// 4pt grid system
export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const
```

**Step 4: Create radii.ts**

```typescript
export const radii = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
} as const
```

**Step 5: Create tokens/index.ts**

```typescript
export { colors } from './colors'
export { fontFamily, fontSize, fontWeight, lineHeight, letterSpacing } from './typography'
export { spacing } from './spacing'
export { radii } from './radii'

// Convenience re-export
import { colors } from './colors'
import { fontFamily, fontSize, fontWeight, lineHeight, letterSpacing } from './typography'
import { spacing } from './spacing'
import { radii } from './radii'

export const tokens = { colors, fontFamily, fontSize, fontWeight, lineHeight, letterSpacing, spacing, radii }
```

**Step 6: Commit**

```bash
git add apps/mobile/src/design/
git commit -m "feat: add design tokens (colors, typography, spacing, radii)"
```

---

## Task 7: Primitive components

**Files:**
- Create: `apps/mobile/src/components/primitives/Text.tsx`
- Create: `apps/mobile/src/components/primitives/Box.tsx`
- Create: `apps/mobile/src/components/primitives/Stack.tsx`
- Create: `apps/mobile/src/components/primitives/index.ts`

**Step 1: Create Text primitive**

```tsx
// apps/mobile/src/components/primitives/Text.tsx
import { Text as RNText, TextProps, StyleSheet } from 'react-native'
import { tokens } from '@/design/tokens'

type Variant = 'body' | 'label' | 'caption' | 'heading' | 'title' | 'mono'
type Color = keyof typeof tokens.colors.text

interface Props extends TextProps {
  variant?: Variant
  color?: Color
}

const variantStyles: Record<Variant, object> = {
  title: { fontSize: tokens.fontSize['3xl'], fontWeight: tokens.fontWeight.bold, lineHeight: tokens.fontSize['3xl'] * tokens.lineHeight.tight },
  heading: { fontSize: tokens.fontSize.xl, fontWeight: tokens.fontWeight.semibold },
  body: { fontSize: tokens.fontSize.base, fontWeight: tokens.fontWeight.regular },
  label: { fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.medium },
  caption: { fontSize: tokens.fontSize.xs, fontWeight: tokens.fontWeight.regular },
  mono: { fontSize: tokens.fontSize.sm, fontFamily: tokens.fontFamily.mono },
}

export function Text({ variant = 'body', color = 'primary', style, ...props }: Props) {
  return (
    <RNText
      style={[
        { color: tokens.colors.text[color] },
        variantStyles[variant],
        style,
      ]}
      {...props}
    />
  )
}
```

**Step 2: Create Box primitive**

```tsx
// apps/mobile/src/components/primitives/Box.tsx
import { View, ViewProps } from 'react-native'

export function Box({ style, ...props }: ViewProps) {
  return <View style={style} {...props} />
}
```

**Step 3: Create Stack primitive**

```tsx
// apps/mobile/src/components/primitives/Stack.tsx
import { View, ViewProps } from 'react-native'
import { tokens } from '@/design/tokens'

interface StackProps extends ViewProps {
  direction?: 'row' | 'column'
  gap?: keyof typeof tokens.spacing
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch'
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around'
}

export function Stack({
  direction = 'column',
  gap = 0,
  align,
  justify,
  style,
  ...props
}: StackProps) {
  return (
    <View
      style={[
        {
          flexDirection: direction,
          gap: tokens.spacing[gap],
          alignItems: align,
          justifyContent: justify,
        },
        style,
      ]}
      {...props}
    />
  )
}
```

**Step 4: Create primitives/index.ts**

```typescript
export { Text } from './Text'
export { Box } from './Box'
export { Stack } from './Stack'
```

**Step 5: Commit**

```bash
git add apps/mobile/src/components/primitives/
git commit -m "feat: add Box, Text, Stack primitives"
```

---

## Task 8: Query infrastructure

**Files:**
- Create: `apps/mobile/src/lib/query/keys.ts`
- Create: `apps/mobile/src/lib/query/client.ts`
- Create: `apps/mobile/src/lib/api/client.ts`
- Create: `apps/mobile/src/lib/ws/client.ts`

**Step 1: Create query keys factory**

```typescript
// apps/mobile/src/lib/query/keys.ts
// All query keys in one place. Never use raw string arrays outside this file.

export const queryKeys = {
  // Portfolio
  portfolio: (userId: string) => ['portfolio', userId] as const,
  holdings: (userId: string) => ['portfolio', userId, 'holdings'] as const,

  // Agents
  agents: () => ['agents'] as const,
  agent: (agentId: string) => ['agents', agentId] as const,
  agentHires: (userId: string) => ['agent-hires', userId] as const,

  // Markets
  price: (ticker: string) => ['price', ticker] as const,
  prices: (tickers: string[]) => ['prices', ...tickers] as const,
  search: (query: string) => ['search', query] as const,

  // Challenges
  challenges: (userId: string) => ['challenges', userId] as const,
  challenge: (challengeId: string) => ['challenges', challengeId] as const,

  // Recommendations
  recommendations: (userId: string) => ['recommendations', userId] as const,
} as const
```

**Step 2: Create query client config**

```typescript
// apps/mobile/src/lib/query/client.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,       // 30s — prices refresh via WebSocket
      gcTime: 5 * 60_000,     // 5 min garbage collection
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})
```

**Step 3: Create API client**

```typescript
// apps/mobile/src/lib/api/client.ts
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      // TODO: attach auth token from Zustand auth store
    },
    ...options,
  })

  if (!res.ok) {
    throw new ApiError(res.status, await res.text())
  }

  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
```

**Step 4: Create WebSocket client stub**

```typescript
// apps/mobile/src/lib/ws/client.ts
import { queryClient } from '../query/client'
import { queryKeys } from '../query/keys'

type PriceMessage = { type: 'price'; ticker: string; price: number }
type WsMessage = PriceMessage

let socket: WebSocket | null = null

export function connectPriceFeed(url: string) {
  if (socket) return

  socket = new WebSocket(url)

  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data as string) as WsMessage

    if (msg.type === 'price') {
      // Bridge WebSocket prices directly into TanStack Query cache
      queryClient.setQueryData(queryKeys.price(msg.ticker), msg.price)
    }
  }

  socket.onclose = () => {
    socket = null
    // Reconnect after 3 seconds
    setTimeout(() => connectPriceFeed(url), 3_000)
  }
}

export function disconnectPriceFeed() {
  socket?.close()
  socket = null
}
```

**Step 5: Commit**

```bash
git add apps/mobile/src/lib/
git commit -m "feat: add query keys factory, API client, and WebSocket price feed client"
```

---

## Task 9: Feature module stubs

**Files:**
- Create: `apps/mobile/src/features/portfolio/index.ts`
- Create: `apps/mobile/src/features/portfolio/hooks/usePortfolio.ts`
- Create: `apps/mobile/src/features/agents/index.ts`
- Create: `apps/mobile/src/features/agents/hooks/useAgents.ts`
- Create: `apps/mobile/src/features/auth/index.ts`
- Create: `apps/mobile/src/features/auth/store.ts`
- Create: `apps/mobile/src/features/markets/index.ts`
- Create: `apps/mobile/src/features/markets/hooks/usePrices.ts`
- Create: `apps/mobile/src/features/trade/index.ts`
- Create: `apps/mobile/src/features/challenges/index.ts`

**Step 1: Create portfolio feature**

```typescript
// apps/mobile/src/features/portfolio/hooks/usePortfolio.ts
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/query/keys'
import type { User } from '@mockket/shared'

export function usePortfolio(userId: string) {
  return useQuery({
    queryKey: queryKeys.portfolio(userId),
    queryFn: () => api.get<{ cash: number; totalValue: number }>(`/portfolio/${userId}`),
    enabled: Boolean(userId),
  })
}
```

```typescript
// apps/mobile/src/features/portfolio/index.ts
export { usePortfolio } from './hooks/usePortfolio'
```

**Step 2: Create agents feature**

```typescript
// apps/mobile/src/features/agents/hooks/useAgents.ts
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/query/keys'
import type { AgentMeta } from '@mockket/shared'

export function useAgents() {
  return useQuery({
    queryKey: queryKeys.agents(),
    queryFn: () => api.get<AgentMeta[]>('/agents'),
    staleTime: 5 * 60_000, // agents don't change often
  })
}
```

```typescript
// apps/mobile/src/features/agents/index.ts
export { useAgents } from './hooks/useAgents'
```

**Step 3: Create auth Zustand store**

```typescript
// apps/mobile/src/features/auth/store.ts
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

```typescript
// apps/mobile/src/features/auth/index.ts
export { useAuthStore } from './store'
```

**Step 4: Create markets feature (price hook)**

```typescript
// apps/mobile/src/features/markets/hooks/usePrices.ts
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'

// Prices are populated by the WebSocket client (lib/ws/client.ts)
// This hook subscribes to the cache — no manual fetch needed for live prices.
export function usePrice(ticker: string) {
  return useQuery<number>({
    queryKey: queryKeys.price(ticker),
    queryFn: () => Promise.resolve(0), // initial value; WS overwrites
    staleTime: Infinity,
  })
}
```

```typescript
// apps/mobile/src/features/markets/index.ts
export { usePrice } from './hooks/usePrices'
```

**Step 5: Create remaining feature index stubs**

```typescript
// apps/mobile/src/features/trade/index.ts
// TODO: trade submission hooks and components
```

```typescript
// apps/mobile/src/features/challenges/index.ts
// TODO: challenge hooks and components
```

**Step 6: Commit**

```bash
git add apps/mobile/src/features/
git commit -m "feat: add feature module stubs (portfolio, agents, auth, markets, trade, challenges)"
```

---

## Task 10: MD documentation files

**Files:**
- Create: `AGENTS.md`
- Create: `ARCHITECTURE.md`
- Create: `DESIGN_SYSTEM.md`
- Create: `CONTRIBUTING.md`
- Create: `packages/agents/AGENTS.md`
- Create: `packages/api/AGENTS.md`
- Create: `apps/mobile/AGENTS.md`

**Step 1: Create root AGENTS.md**

See content in Task 10 implementation notes — full content is the root agent guide covering repo structure, commands, key patterns, and navigation rules.

**Step 2: Create ARCHITECTURE.md**

Full system design doc covering: data flow diagram, state ownership map, WebSocket bridge pattern, Alpaca proxy, query key conventions, feature boundary rules.

**Step 3: Create DESIGN_SYSTEM.md**

Full design system reference: token values, component hierarchy, naming rules, usage examples, do/don't patterns.

**Step 4: Create CONTRIBUTING.md**

File naming, import order, PR process, commit message format, testing policy, code style rules.

**Step 5: Create package AGENTS.md files**

Each package gets a focused AGENTS.md covering: what this package does, how to add to it, key files, conventions specific to that package.

**Step 6: Commit**

```bash
git add AGENTS.md ARCHITECTURE.md DESIGN_SYSTEM.md CONTRIBUTING.md packages/agents/AGENTS.md packages/api/AGENTS.md apps/mobile/AGENTS.md
git commit -m "docs: add AGENTS.md, ARCHITECTURE.md, DESIGN_SYSTEM.md, CONTRIBUTING.md"
```

---

## Task 11: Push all

```bash
git push
```

---

## Summary

After this plan is complete, the repo will have:

- Full monorepo structure (Turborepo, 3 packages + 1 app)
- All shared TypeScript types
- Agent module stubs (Marcus, Priya) conforming to the interface
- Expo Router app with all screens stubbed
- Design token system (colors, type, spacing, radii)
- Primitive components (Box, Text, Stack)
- TanStack Query infrastructure (keys factory, client config)
- WebSocket → Query cache bridge
- Feature module stubs for all 6 features
- 7 MD documentation files (AGENTS, ARCHITECTURE, DESIGN_SYSTEM, CONTRIBUTING + package-level AGENTS.md files)
