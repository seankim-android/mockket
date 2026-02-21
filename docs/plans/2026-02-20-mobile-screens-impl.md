# Mobile Screens Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete all missing and incomplete mobile screens so the full MVP user flow works end-to-end.

**Architecture:** Expo Router v4 file-based routing. All screens live in `apps/mobile/app/`. Data comes from existing TanStack Query hooks in `apps/mobile/src/features/`. Design tokens at `apps/mobile/src/design/tokens/`.

**Tech Stack:** React Native 0.76, Expo Router v4, TanStack Query v5, Zustand, lucide-react-native, react-native-purchases, Supabase Auth

**Current state:** Most screens exist as functional stubs. Missing: auth gate, welcome/sign-up, Activity tab, and significant completions across Home, Trade, Challenge, Recap, Agent, and Settings screens.

---

## What already exists (do not recreate)

- `app/_layout.tsx` — root layout with QueryClientProvider
- `app/(auth)/_layout.tsx` — Stack, no header
- `app/(auth)/sign-in.tsx` — sign-in form
- `app/(tabs)/_layout.tsx` — 5-tab layout (Home, Markets, Agents, Challenges, Portfolio)
- `app/(tabs)/index.tsx` — Home stub (market status + mission cards + leaderboard preview)
- `app/(tabs)/markets.tsx` — Markets list (complete)
- `app/(tabs)/agents.tsx` — Agents marketplace (complete)
- `app/(tabs)/challenges.tsx` — Challenges + leaderboard (vs Marcus only)
- `app/(tabs)/portfolio.tsx` — Portfolio + Settings (combined tab)
- `app/agent/[id].tsx` — Agent profile with hire/fire, trade log
- `app/challenge/[id].tsx` — Challenge detail stub
- `app/challenge/invite/[token].tsx` — Invite acceptance
- `app/recap/[challengeId].tsx` — Recap stub
- `app/recommendation/[id].tsx` — Recommendation approval (complete)
- `app/trade/[ticker].tsx` — Trade entry (complete)
- `app/trade/confirmation.tsx` — Trade confirmation (complete)
- `app/trade/success.tsx` — Trade success with PDT warning (complete)
- `app/trade/first-trade-moment.tsx` — Post-first-trade stub

---

## Task 1: Auth gate in root layout

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`

The root layout needs to watch auth state and redirect unauthenticated users to the welcome screen. Currently it has no auth logic.

**Step 1: Update `_layout.tsx`**

```tsx
import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSession } from '@/features/auth/hooks/useSession'
import { useAuthStore } from '@/features/auth/store'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 2 } },
})

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const segments = useSegments()
  const { session, isLoading } = useAuthStore()
  useSession() // initializes Supabase session listener

  useEffect(() => {
    if (isLoading) return
    const inAuth = segments[0] === '(auth)'
    if (!session && !inAuth) {
      router.replace('/(auth)/welcome')
    } else if (session && inAuth) {
      router.replace('/(tabs)/')
    }
  }, [session, isLoading, segments])

  if (isLoading) return null // splash screen covers this
  return <>{children}</>
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthGate>
    </QueryClientProvider>
  )
}
```

**Step 2: Verify**

Run `npx tsc --noEmit` in `apps/mobile/`. Fix any type errors (likely none).

**Step 3: Commit**

```bash
git add apps/mobile/app/_layout.tsx
git commit -m "feat: add auth gate to root layout"
```

---

## Task 2: Welcome/onboarding screen

**Files:**
- Create: `apps/mobile/app/(auth)/welcome.tsx`

3-step carousel: Welcome → How it works → Notification permission. After step 3 → `/(auth)/sign-up`.

**Step 1: Create `welcome.tsx`**

```tsx
import { useState } from 'react'
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { Text } from '@/components/primitives'
import { tokens } from '@/design/tokens'

const { width } = Dimensions.get('window')

const STEPS = [
  {
    title: 'Mockket',
    body: 'Outthink the AI.\nLearn why you lost.',
    cta: 'Get Started',
  },
  {
    title: 'How it works',
    bullets: [
      'Trade with $100k paper cash against live prices',
      'Challenge AI agents with real track records',
      'See exactly where you diverged and what it cost you',
    ],
    cta: 'Continue',
    skip: true,
  },
  {
    title: 'Stay in the loop',
    body: 'Marcus wants to send you trade tips and agent updates.',
    cta: 'Allow Notifications',
    skipLabel: 'Not Now',
  },
]

export default function Welcome() {
  const router = useRouter()
  const [step, setStep] = useState(0)

  async function handleCta() {
    if (step === 2) {
      // TODO: trigger OS notification permission prompt
      // Notifications.requestPermissionsAsync() — add expo-notifications in v2
      router.replace('/(auth)/sign-up')
      return
    }
    setStep((s) => s + 1)
  }

  function handleSkip() {
    if (step === 2) {
      router.replace('/(auth)/sign-up')
    } else {
      setStep((s) => s + 1)
    }
  }

  const current = STEPS[step]

  return (
    <View style={styles.container}>
      {/* Step dots */}
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === step && styles.dotActive]}
          />
        ))}
      </View>

      <View style={styles.content}>
        <Text variant="heading" style={styles.title}>{current.title}</Text>

        {current.body && (
          <Text variant="body" color="secondary" style={styles.body}>
            {current.body}
          </Text>
        )}

        {'bullets' in current && current.bullets && (
          <View style={styles.bullets}>
            {current.bullets.map((b, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text variant="body" style={styles.bulletDot}>·</Text>
                <Text variant="body" color="secondary" style={styles.bulletText}>{b}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.cta} onPress={handleCta}>
          <Text variant="label" style={{ color: '#fff' }}>{current.cta}</Text>
        </TouchableOpacity>
        {(current.skip || current.skipLabel) && (
          <TouchableOpacity style={styles.skip} onPress={handleSkip}>
            <Text variant="label" color="secondary">
              {current.skipLabel ?? 'Skip'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg.primary,
    padding: tokens.spacing[6],
    paddingTop: 80,
  },
  dots: {
    flexDirection: 'row',
    gap: tokens.spacing[2],
    marginBottom: tokens.spacing[8],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.colors.bg.tertiary,
  },
  dotActive: {
    backgroundColor: tokens.colors.brand.default,
    width: 24,
  },
  content: { flex: 1, justifyContent: 'center' },
  title: { marginBottom: tokens.spacing[4] },
  body: { lineHeight: 26 },
  bullets: { gap: tokens.spacing[4] },
  bulletRow: { flexDirection: 'row', gap: tokens.spacing[2] },
  bulletDot: { color: tokens.colors.brand.default },
  bulletText: { flex: 1, lineHeight: 22 },
  actions: { gap: tokens.spacing[3] },
  cta: {
    backgroundColor: tokens.colors.brand.default,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing[4],
    alignItems: 'center',
  },
  skip: { padding: tokens.spacing[3], alignItems: 'center' },
})
```

**Step 2: Type-check**

```bash
cd apps/mobile && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add apps/mobile/app/(auth)/welcome.tsx
git commit -m "feat: add welcome onboarding screen (3-step carousel)"
```

---

## Task 3: Sign-up screen

**Files:**
- Create: `apps/mobile/app/(auth)/sign-up.tsx`

**Step 1: Create `sign-up.tsx`**

```tsx
import { useState } from 'react'
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { Text } from '@/components/primitives'
import { supabase } from '@/lib/supabase'
import { tokens } from '@/design/tokens'

export default function SignUp() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignUp() {
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (err) { setError(err.message); return }
    // Auth gate in _layout.tsx will redirect to (tabs) on session
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text variant="heading" style={styles.title}>Create account</Text>
      <Text variant="body" color="secondary" style={styles.sub}>
        Start with $100,000 in paper cash.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={tokens.colors.text.muted}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={tokens.colors.text.muted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error && (
        <Text variant="caption" style={{ color: tokens.colors.error, marginBottom: tokens.spacing[3] }}>
          {error}
        </Text>
      )}

      <TouchableOpacity style={[styles.cta, loading && { opacity: 0.6 }]} onPress={handleSignUp} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text variant="label" style={{ color: '#fff' }}>Create Account</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.signIn} onPress={() => router.push('/(auth)/sign-in')}>
        <Text variant="label" color="secondary">Already have an account? Sign in</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.bg.primary, padding: tokens.spacing[6], paddingTop: 80 },
  title: { marginBottom: tokens.spacing[2] },
  sub: { marginBottom: tokens.spacing[8] },
  input: {
    backgroundColor: tokens.colors.bg.secondary,
    borderRadius: tokens.radii.md,
    padding: tokens.spacing[4],
    color: tokens.colors.text.primary,
    fontSize: tokens.fontSize.base,
    marginBottom: tokens.spacing[3],
    borderWidth: 1,
    borderColor: tokens.colors.border.default,
  },
  cta: {
    backgroundColor: tokens.colors.brand.default,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing[4],
    alignItems: 'center',
    marginBottom: tokens.spacing[3],
  },
  signIn: { padding: tokens.spacing[3], alignItems: 'center' },
})
```

**Step 2: Type-check and commit**

```bash
cd apps/mobile && npx tsc --noEmit
git add apps/mobile/app/(auth)/sign-up.tsx
git commit -m "feat: add sign-up screen"
```

---

## Task 4: Fix tab bar + add Activity tab

**Files:**
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`
- Create: `apps/mobile/app/(tabs)/activity.tsx`

The current tab bar uses indigo (`#6366F1`) as active color — should be emerald brand green. Also missing the Activity tab.

**Step 1: Fix tab layout**

Replace the contents of `apps/mobile/app/(tabs)/_layout.tsx`:

```tsx
import { Tabs } from 'expo-router'
import { Home, TrendingUp, Users, Trophy, PieChart, Activity } from 'lucide-react-native'
import { tokens } from '@/design/tokens'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.colors.brand.default,
        tabBarInactiveTintColor: tokens.colors.text.muted,
        tabBarStyle: {
          backgroundColor: tokens.colors.bg.secondary,
          borderTopColor: tokens.colors.border.subtle,
          borderTopWidth: 1,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <Home color={color} size={22} /> }} />
      <Tabs.Screen name="markets" options={{ title: 'Markets', tabBarIcon: ({ color }) => <TrendingUp color={color} size={22} /> }} />
      <Tabs.Screen name="agents" options={{ title: 'Agents', tabBarIcon: ({ color }) => <Users color={color} size={22} /> }} />
      <Tabs.Screen name="challenges" options={{ title: 'Challenges', tabBarIcon: ({ color }) => <Trophy color={color} size={22} /> }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity', tabBarIcon: ({ color }) => <Activity color={color} size={22} /> }} />
      <Tabs.Screen name="portfolio" options={{ title: 'Portfolio', tabBarIcon: ({ color }) => <PieChart color={color} size={22} /> }} />
    </Tabs>
  )
}
```

**Step 2: Create Activity tab**

Create `apps/mobile/app/(tabs)/activity.tsx`:

```tsx
import { FlatList, StyleSheet, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Text } from '@/components/primitives'
import { api } from '@/lib/api/client'
import { tokens } from '@/design/tokens'

interface ActivityItem {
  id: string
  type: 'trade' | 'agent_trade' | 'dividend' | 'split' | 'agent_reaction'
  agent_id: string | null
  ticker: string | null
  action: string | null
  quantity: number | null
  price: number | null
  total: number | null
  quote: string | null
  created_at: string
}

const AGENT_NAMES: Record<string, string> = {
  'marcus-bull-chen': 'Marcus',
  'priya-sharma': 'Priya',
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const agentName = item.agent_id ? (AGENT_NAMES[item.agent_id] ?? item.agent_id) : 'You'
  const isAgent = !!item.agent_id
  const actionColor = item.action === 'buy' ? tokens.colors.positive : tokens.colors.negative

  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        {/* Avatar dot */}
        <View style={[styles.avatar, { backgroundColor: isAgent ? tokens.colors.warning : tokens.colors.brand.default }]}>
          <Text style={styles.avatarText}>{agentName[0]}</Text>
        </View>
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowHeader}>
          <Text variant="label">{agentName}</Text>
          {item.action && item.ticker && (
            <Text variant="caption" style={{ color: actionColor }}>
              {item.action.toUpperCase()} {item.ticker}
            </Text>
          )}
        </View>
        {item.quote ? (
          <Text variant="caption" color="secondary" style={styles.quote}>"{item.quote}"</Text>
        ) : item.type === 'dividend' ? (
          <Text variant="caption" color="secondary">Dividend credit</Text>
        ) : item.quantity && item.price ? (
          <Text variant="caption" color="secondary">
            {item.quantity} shares @ ${Number(item.price).toFixed(2)}
          </Text>
        ) : null}
        <Text variant="caption" color="secondary" style={styles.time}>
          {new Date(item.created_at).toLocaleString()}
        </Text>
      </View>
    </View>
  )
}

export default function ActivityScreen() {
  const { data: items = [], isLoading } = useQuery<ActivityItem[]>({
    queryKey: ['activity'],
    queryFn: () => api.get<ActivityItem[]>('/activity'),
    refetchInterval: 30_000,
  })

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text variant="body" color="secondary">Loading…</Text>
      </View>
    )
  }

  if (items.length === 0) {
    return (
      <View style={styles.centered}>
        <Text variant="body" color="secondary">No activity yet.</Text>
        <Text variant="caption" color="secondary" style={{ marginTop: tokens.spacing[2], textAlign: 'center' }}>
          Hire an agent to see their moves here.
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text variant="heading" style={styles.title}>Activity</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ActivityRow item={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.bg.primary, paddingTop: 60 },
  centered: {
    flex: 1,
    backgroundColor: tokens.colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing[6],
  },
  title: { paddingHorizontal: tokens.spacing[4], marginBottom: tokens.spacing[4] },
  list: { paddingBottom: tokens.spacing[8] },
  row: {
    flexDirection: 'row',
    paddingHorizontal: tokens.spacing[4],
    paddingVertical: tokens.spacing[3],
    gap: tokens.spacing[3],
  },
  rowLeft: { paddingTop: 2 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  rowContent: { flex: 1, gap: tokens.spacing[1] },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quote: { fontStyle: 'italic', lineHeight: 18 },
  time: { marginTop: tokens.spacing[1] },
  separator: { height: 1, backgroundColor: tokens.colors.border.default, marginHorizontal: tokens.spacing[4] },
})
```

Note: The `/activity` endpoint needs to exist on the backend. If it doesn't exist yet, the screen degrades gracefully to empty state. Add a `GET /activity` route to `packages/api/src/routes/` that returns recent trades + agent trades + dividends for the current user.

**Step 3: Type-check and commit**

```bash
cd apps/mobile && npx tsc --noEmit
git add apps/mobile/app/(tabs)/_layout.tsx apps/mobile/app/(tabs)/activity.tsx
git commit -m "feat: add Activity tab, fix tab bar brand color"
```

---

## Task 5: Complete Home screen

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`

Add portfolio value display, agent activity feed, active challenge card, and day 2 re-engagement card.

**Step 1: Replace Home screen content**

Add these imports to the existing file:

```tsx
import { useAuthStore } from '@/features/auth/store'
import { useFtue } from '@/features/ftue/useFtue'
import { useRouter } from 'expo-router'
```

Add the following sections between `<MissionCards />` and `<LeaderboardPreview />`:

```tsx
// Portfolio value section (add near top of Home component)
const { profile } = useAuthStore()
const router = useRouter()
const { progress, shouldShowDay2Card } = useFtue()

const { data: portfolio } = useQuery({
  queryKey: ['portfolio'],
  queryFn: () => api.get<{ cash: number; totalValue: number; returnPct: number }>('/portfolio'),
})

const { data: activeChallenges = [] } = useQuery({
  queryKey: ['challenges', 'active'],
  queryFn: () => api.get<any[]>('/challenges?status=active'),
})

const { data: agentActivity = [] } = useQuery({
  queryKey: ['activity'],
  queryFn: () => api.get<any[]>('/activity'),
  select: (data) => data.slice(0, 5),
})
```

Add portfolio header after the existing header View:

```tsx
{/* Portfolio value */}
{portfolio && (
  <View style={styles.portfolioCard}>
    <Text variant="caption" color="secondary">Portfolio Value</Text>
    <Text style={styles.portfolioValue}>
      ${portfolio.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </Text>
    <Text variant="body" style={{ color: portfolio.returnPct >= 0 ? '#10B981' : '#EF4444' }}>
      {portfolio.returnPct >= 0 ? '+' : ''}{portfolio.returnPct?.toFixed(2) ?? '0.00'}% all time
    </Text>
  </View>
)}

{/* Day 2 card */}
{shouldShowDay2Card(profile?.createdAt) && (
  <TouchableOpacity
    style={styles.day2Card}
    onPress={() => router.push('/(tabs)/challenges')}
  >
    <Text variant="label">Marcus is watching the market. Are you ahead?</Text>
    <Text variant="caption" style={{ color: tokens.colors.brand.default, marginTop: tokens.spacing[1] }}>
      Start a challenge →
    </Text>
  </TouchableOpacity>
)}

{/* Active challenge */}
{activeChallenges.length > 0 && (
  <View style={[styles.section, styles.glowCard]}>
    <Text variant="label" color="secondary" style={styles.sectionTitle}>ACTIVE CHALLENGE</Text>
    <TouchableOpacity onPress={() => router.push(`/challenge/${activeChallenges[0].id}`)}>
      <Text variant="label">vs {activeChallenges[0].agent_id ?? 'Friend'}</Text>
      <Text variant="caption" color="secondary">
        Ends {activeChallenges[0].ends_at ? new Date(activeChallenges[0].ends_at).toLocaleDateString() : '—'}
      </Text>
    </TouchableOpacity>
  </View>
)}

{/* Agent activity feed */}
{agentActivity.length > 0 && (
  <View style={styles.section}>
    <Text variant="label" color="secondary" style={styles.sectionTitle}>TODAY'S MOVES</Text>
    {agentActivity.map((item: any) => (
      <View key={item.id} style={styles.feedRow}>
        <Text variant="caption" style={{ color: tokens.colors.warning }}>
          {item.agent_id ? 'Marcus' : 'You'}
        </Text>
        <Text variant="caption" color="secondary" style={{ flex: 1, marginLeft: tokens.spacing[2] }}>
          {item.action?.toUpperCase()} {item.quantity} {item.ticker}
          {item.quote ? ` — "${item.quote}"` : ''}
        </Text>
      </View>
    ))}
  </View>
)}
```

Add to `styles` StyleSheet:

```tsx
portfolioCard: {
  backgroundColor: tokens.colors.bg.secondary,
  borderRadius: tokens.radii.xl,
  padding: tokens.spacing[6],
  alignItems: 'center',
  gap: tokens.spacing[2],
  marginBottom: tokens.spacing[4],
  borderWidth: 1,
  borderColor: tokens.colors.border.default,
},
portfolioValue: {
  fontSize: 36,
  fontWeight: '700',
  color: tokens.colors.text.primary,
  fontVariant: ['tabular-nums'],
},
day2Card: {
  backgroundColor: tokens.colors.bg.secondary,
  borderRadius: tokens.radii.lg,
  padding: tokens.spacing[4],
  marginBottom: tokens.spacing[4],
  borderLeftWidth: 3,
  borderLeftColor: tokens.colors.brand.default,
},
glowCard: {
  shadowColor: tokens.colors.brand.default,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.2,
  shadowRadius: 12,
  elevation: 4,
},
feedRow: {
  flexDirection: 'row',
  paddingVertical: tokens.spacing[2],
  borderBottomWidth: StyleSheet.hairlineWidth,
  borderBottomColor: tokens.colors.border.default,
},
```

**Step 2: Type-check and commit**

```bash
cd apps/mobile && npx tsc --noEmit
git add apps/mobile/app/(tabs)/index.tsx
git commit -m "feat: complete Home screen — portfolio value, agent feed, challenge card, day 2 card"
```

---

## Task 6: Trade flow — FTUE annotations + market-closed warning

**Files:**
- Modify: `apps/mobile/app/trade/confirmation.tsx`

Add FTUE inline annotations (shown once on first trade) and a market-closed warning banner.

**Step 1: Update `confirmation.tsx`**

Add imports:

```tsx
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
```

Add inside `TradeConfirmation` component:

```tsx
// FTUE: check if first trade annotation should show
const { data: ftue } = useQuery({
  queryKey: ['ftue'],
  queryFn: () => api.get<{ first_trade_annotation_shown: boolean }>('/ftue'),
})
const showAnnotation = !ftue?.first_trade_annotation_shown

// Market status
const { data: marketStatus } = useQuery({
  queryKey: ['market-status'],
  queryFn: () => api.get<{ status: string }>('/market-status'),
  staleTime: 60_000,
})
const marketClosed = marketStatus?.status !== 'open'
```

Add after the disclaimer Text and before the error message:

```tsx
{/* Market closed warning */}
{marketClosed && (
  <View style={styles.marketClosedBanner}>
    <Text variant="label" style={{ color: tokens.colors.warning }}>Market is closed</Text>
    <Text variant="caption" color="secondary" style={{ marginTop: tokens.spacing[1] }}>
      Your order will execute at the next market open.
    </Text>
  </View>
)}

{/* FTUE bid/ask annotation — shown once */}
{showAnnotation && (
  <View style={styles.annotation}>
    <Text variant="caption" color="secondary">
      {action === 'buy'
        ? '💡 You buy at the ask — the price sellers will accept. The spread (ask − bid) is the real cost of the trade.'
        : '💡 You sell at the bid — the highest price buyers will pay right now.'}
    </Text>
  </View>
)}
```

Add to styles:

```tsx
marketClosedBanner: {
  backgroundColor: '#FBBF2420',
  borderRadius: tokens.radii.md,
  borderWidth: 1,
  borderColor: tokens.colors.warning,
  padding: tokens.spacing[3],
  marginBottom: tokens.spacing[3],
},
annotation: {
  backgroundColor: tokens.colors.bg.secondary,
  borderRadius: tokens.radii.md,
  padding: tokens.spacing[3],
  marginBottom: tokens.spacing[3],
  borderLeftWidth: 2,
  borderLeftColor: tokens.colors.brand.default,
},
```

**Step 2: Type-check and commit**

```bash
cd apps/mobile && npx tsc --noEmit
git add apps/mobile/app/trade/confirmation.tsx
git commit -m "feat: add FTUE annotations and market-closed warning to trade confirmation"
```

---

## Task 7: Challenge creation — add friend challenge via username

**Files:**
- Modify: `apps/mobile/app/(tabs)/challenges.tsx`

The current new challenge modal only creates vs Marcus. Add opponent type selection (Agent vs Friend) and username search for friend challenges.

**Step 1: Add state + logic to `ChallengesScreen`**

Add new state variables inside `ChallengesScreen`:

```tsx
const [opponentType, setOpponentType] = useState<'agent' | 'friend'>('agent')
const [friendUsername, setFriendUsername] = useState('')
const [friendSearchResults, setFriendSearchResults] = useState<Array<{ id: string; display_name: string }>>([])
const [selectedFriend, setSelectedFriend] = useState<{ id: string; display_name: string } | null>(null)
```

Add a search handler:

```tsx
async function searchFriend() {
  if (!friendUsername.trim()) return
  try {
    const results = await api.get<Array<{ id: string; display_name: string }>>(
      `/users/search?q=${encodeURIComponent(friendUsername)}`
    )
    setFriendSearchResults(results)
  } catch {
    setFriendSearchResults([])
  }
}
```

Update `createChallenge` mutation to handle both opponent types:

```tsx
const { mutate: createChallenge, isPending: isCreating } = useMutation({
  mutationFn: () =>
    api.post('/challenges', {
      duration,
      startingBalance: parseFloat(startingBalance),
      agentId: opponentType === 'agent' ? 'marcus-bull-chen' : null,
      opponentUserId: opponentType === 'friend' ? selectedFriend?.id : null,
    }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['challenges'] })
    setShowNew(false)
    setOpponentType('agent')
    setFriendUsername('')
    setSelectedFriend(null)
  },
})
```

In the modal, add opponent type selection before the duration selector:

```tsx
<Text variant="label" color="secondary" style={{ marginBottom: tokens.spacing[2] }}>Challenge</Text>
<View style={styles.durationRow}>
  {(['agent', 'friend'] as const).map((t) => (
    <TouchableOpacity
      key={t}
      style={[styles.durationBtn, opponentType === t && styles.durationActive]}
      onPress={() => setOpponentType(t)}
    >
      <Text variant="label" style={opponentType === t ? { color: '#fff' } : { color: tokens.colors.text.secondary }}>
        {t === 'agent' ? 'vs Agent' : 'vs Friend'}
      </Text>
    </TouchableOpacity>
  ))}
</View>

{opponentType === 'friend' && (
  <View style={{ marginTop: tokens.spacing[4] }}>
    <Text variant="label" color="secondary" style={{ marginBottom: tokens.spacing[2] }}>Friend's username</Text>
    <View style={{ flexDirection: 'row', gap: tokens.spacing[2] }}>
      <TextInput
        style={[styles.input, { flex: 1, marginBottom: 0 }]}
        value={friendUsername}
        onChangeText={setFriendUsername}
        placeholder="Search by username"
        placeholderTextColor={tokens.colors.text.muted}
        autoCapitalize="none"
      />
      <TouchableOpacity
        style={[styles.durationBtn, { paddingHorizontal: tokens.spacing[3] }]}
        onPress={searchFriend}
      >
        <Text variant="label" color="secondary">Search</Text>
      </TouchableOpacity>
    </View>
    {friendSearchResults.map((u) => (
      <TouchableOpacity
        key={u.id}
        style={[styles.card, { marginTop: tokens.spacing[2], padding: tokens.spacing[3] },
          selectedFriend?.id === u.id && { borderColor: tokens.colors.brand.default, borderWidth: 1 }
        ]}
        onPress={() => setSelectedFriend(u)}
      >
        <Text variant="label">{u.display_name}</Text>
      </TouchableOpacity>
    ))}
  </View>
)}
```

Update the Start Challenge button disabled condition:

```tsx
disabled={isCreating || (opponentType === 'friend' && !selectedFriend)}
```

**Step 2: Type-check and commit**

```bash
cd apps/mobile && npx tsc --noEmit
git add apps/mobile/app/(tabs)/challenges.tsx
git commit -m "feat: add friend challenge creation via username search"
```

---

## Task 8: Challenge detail — live standings + forfeit

**Files:**
- Modify: `apps/mobile/app/challenge/[id].tsx`

Add live standings card and forfeit button with confirmation.

**Step 1: Update challenge detail**

Add imports:

```tsx
import { Alert, ScrollView } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
```

Add forfeit mutation and standings fetch inside `ChallengeDetail`:

```tsx
const queryClient = useQueryClient()

const { data: standings } = useQuery({
  queryKey: ['challenge-standings', id],
  queryFn: () => api.get<{ userReturnPct: number; opponentReturnPct: number }>(`/challenges/${id}/standings`),
  enabled: challenge?.status === 'active',
  refetchInterval: 60_000,
})

const { mutate: forfeit, isPending: isForfeiting } = useMutation({
  mutationFn: () => api.post(`/challenges/${id}/forfeit`, {}),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['challenge', id] })
    queryClient.invalidateQueries({ queryKey: ['challenges'] })
    router.replace('/(tabs)/challenges')
  },
})

function handleForfeit() {
  Alert.alert(
    'Forfeit challenge?',
    'This counts as a loss in your challenge history.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Forfeit', style: 'destructive', onPress: () => forfeit() },
    ]
  )
}
```

Change the outer `<View>` to `<ScrollView>` and add standings + forfeit UI:

```tsx
// After the existing card, add:
{standings && challenge?.status === 'active' && (
  <View style={styles.standingsCard}>
    <Text variant="label" color="secondary" style={styles.sectionTitle}>LIVE STANDINGS</Text>
    <View style={styles.standingsRow}>
      <View style={styles.standingsSide}>
        <Text variant="caption" color="secondary">You</Text>
        <Text variant="label" style={{
          color: standings.userReturnPct >= 0 ? tokens.colors.positive : tokens.colors.negative
        }}>
          {standings.userReturnPct >= 0 ? '+' : ''}{standings.userReturnPct.toFixed(2)}%
        </Text>
      </View>
      <Text variant="caption" color="secondary">vs</Text>
      <View style={[styles.standingsSide, { alignItems: 'flex-end' }]}>
        <Text variant="caption" color="secondary">{challenge.agent_id ?? 'Friend'}</Text>
        <Text variant="label" style={{
          color: standings.opponentReturnPct >= 0 ? tokens.colors.positive : tokens.colors.negative
        }}>
          {standings.opponentReturnPct >= 0 ? '+' : ''}{standings.opponentReturnPct.toFixed(2)}%
        </Text>
      </View>
    </View>
  </View>
)}

{challenge?.status === 'active' && (
  <TouchableOpacity
    style={styles.forfeitBtn}
    onPress={handleForfeit}
    disabled={isForfeiting}
  >
    <Text variant="label" style={{ color: tokens.colors.negative }}>
      {isForfeiting ? 'Forfeiting…' : 'Forfeit challenge'}
    </Text>
  </TouchableOpacity>
)}
```

Add to styles:

```tsx
standingsCard: {
  backgroundColor: tokens.colors.bg.secondary,
  borderRadius: tokens.radii.lg,
  padding: tokens.spacing[4],
  marginBottom: tokens.spacing[3],
},
sectionTitle: { marginBottom: tokens.spacing[3], letterSpacing: 1 },
standingsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
standingsSide: { gap: tokens.spacing[1] },
forfeitBtn: {
  borderWidth: 1,
  borderColor: tokens.colors.negative,
  borderRadius: tokens.radii.lg,
  padding: tokens.spacing[3],
  alignItems: 'center',
  marginTop: tokens.spacing[4],
},
```

**Step 2: Type-check and commit**

```bash
cd apps/mobile && npx tsc --noEmit
git add apps/mobile/app/challenge/[id].tsx
git commit -m "feat: add live standings and forfeit to challenge detail"
```

---

## Task 9: Recap — autopsy expand

**Files:**
- Modify: `apps/mobile/app/recap/[challengeId].tsx`

Add an expandable autopsy section with key trades and the "See where it slipped away" CTA.

**Step 1: Add autopsy to recap**

Add state and data inside `Recap`:

```tsx
const [showAutopsy, setShowAutopsy] = useState(false)

const { data: autopsy, isLoading: isLoadingAutopsy } = useQuery({
  queryKey: ['challenge-autopsy', challengeId],
  queryFn: () => api.get<Array<{
    label: string
    userAction: string
    agentAction: string
    outcome: string
    impactPct: number
  }>>(`/challenges/${challengeId}/autopsy`),
  enabled: showAutopsy,
})
```

Add below the agent quote and above the homeBtn:

```tsx
{/* Autopsy CTA */}
{challenge.status === 'completed' && !challenge.is_forfeited && (
  <TouchableOpacity
    style={styles.autopsyBtn}
    onPress={() => setShowAutopsy((v) => !v)}
  >
    <Text variant="label" style={{ color: tokens.colors.brand.default }}>
      {userWon ? 'See what worked' : 'See where it slipped away'}
    </Text>
  </TouchableOpacity>
)}

{showAutopsy && (
  <View style={styles.autopsyCard}>
    {isLoadingAutopsy && <Text variant="caption" color="secondary">Loading…</Text>}
    {autopsy?.map((moment, i) => (
      <View key={i} style={styles.autopsyMoment}>
        <Text variant="label" style={{ marginBottom: tokens.spacing[2] }}>{moment.label}</Text>
        <Text variant="caption" color="secondary">You: {moment.userAction}</Text>
        <Text variant="caption" color="secondary">{challenge.agent_id ?? 'Opponent'}: {moment.agentAction}</Text>
        <Text variant="caption" style={{
          color: moment.impactPct >= 0 ? tokens.colors.positive : tokens.colors.negative,
          marginTop: tokens.spacing[2]
        }}>
          {moment.outcome}
        </Text>
      </View>
    ))}
  </View>
)}
```

Add to styles:

```tsx
autopsyBtn: { padding: tokens.spacing[3], alignItems: 'center', marginBottom: tokens.spacing[3] },
autopsyCard: {
  backgroundColor: tokens.colors.bg.secondary,
  borderRadius: tokens.radii.lg,
  padding: tokens.spacing[4],
  width: '100%',
  marginBottom: tokens.spacing[4],
  gap: tokens.spacing[4],
},
autopsyMoment: {
  borderLeftWidth: 2,
  borderLeftColor: tokens.colors.brand.default,
  paddingLeft: tokens.spacing[3],
  gap: tokens.spacing[1],
},
```

**Step 2: Type-check and commit**

```bash
cd apps/mobile && npx tsc --noEmit
git add apps/mobile/app/recap/[challengeId].tsx
git commit -m "feat: add expandable autopsy to recap screen"
```

---

## Task 10: Agent profile — color ring, win rate bar, pause/unpause

**Files:**
- Modify: `apps/mobile/app/agent/[id].tsx`

**Step 1: Add agent color ring and win rate bar**

The agent colors are: Marcus = `#F59E0B`, Priya = `#6366F1`.

Add to the component:

```tsx
const AGENT_COLORS: Record<string, string> = {
  'marcus-bull-chen': '#F59E0B',
  'priya-sharma': '#6366F1',
}
const agentColor = AGENT_COLORS[id as string] ?? tokens.colors.brand.default
```

Replace the basic name header with a color-ringed avatar header:

```tsx
{/* Avatar with color ring */}
<View style={styles.avatarWrapper}>
  <View style={[styles.avatarRing, { borderColor: agentColor, shadowColor: agentColor }]}>
    <Text style={styles.avatarInitial}>{agent.name[0]}</Text>
  </View>
</View>
```

Add win rate bar after the badges:

```tsx
{agent.winRate !== undefined && (
  <View style={styles.winRateSection}>
    <View style={styles.winRateHeader}>
      <Text variant="caption" color="secondary">Win Rate</Text>
      <Text variant="label" style={{ color: agentColor }}>
        {Math.round(agent.winRate * 100)}%
      </Text>
    </View>
    <View style={styles.winRateBar}>
      <View style={[styles.winRateFill, { width: `${agent.winRate * 100}%` as any, backgroundColor: agentColor }]} />
    </View>
  </View>
)}
```

Add pause/unpause controls alongside fire in the hire status card:

```tsx
const { mutate: togglePause, isPending: isToggling } = useMutation({
  mutationFn: () =>
    currentHire!.is_paused
      ? api.post(`/agent-hires/${currentHire!.id}/unpause`, {})
      : api.post(`/agent-hires/${currentHire!.id}/pause`, {}),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agent-hires'] }),
})
```

Add pause button in the hire status card next to the fire button:

```tsx
<TouchableOpacity
  style={styles.pauseBtn}
  onPress={() => togglePause()}
  disabled={isToggling}
>
  <Text variant="caption" style={{ color: tokens.colors.warning }}>
    {currentHire.is_paused ? 'Unpause' : 'Pause'}
  </Text>
</TouchableOpacity>
```

Add to styles:

```tsx
avatarWrapper: { alignItems: 'center', marginBottom: tokens.spacing[4] },
avatarRing: {
  width: 72,
  height: 72,
  borderRadius: 36,
  borderWidth: 3,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: tokens.colors.bg.secondary,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.4,
  shadowRadius: 12,
  elevation: 8,
},
avatarInitial: { fontSize: 28, fontWeight: '700', color: tokens.colors.text.primary },
winRateSection: { marginBottom: tokens.spacing[4] },
winRateHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: tokens.spacing[2] },
winRateBar: {
  height: 6,
  backgroundColor: tokens.colors.bg.tertiary,
  borderRadius: 3,
  overflow: 'hidden',
},
winRateFill: { height: '100%', borderRadius: 3 },
pauseBtn: {
  borderWidth: 1,
  borderColor: tokens.colors.warning,
  borderRadius: tokens.radii.md,
  paddingHorizontal: tokens.spacing[3],
  paddingVertical: tokens.spacing[2],
  marginRight: tokens.spacing[2],
},
```

**Step 2: Type-check and commit**

```bash
cd apps/mobile && npx tsc --noEmit
git add apps/mobile/app/agent/[id].tsx
git commit -m "feat: agent profile — color ring, win rate bar, pause/unpause controls"
```

---

## Task 11: First-trade-moment — Marcus CTA

**Files:**
- Modify: `apps/mobile/app/trade/first-trade-moment.tsx`

Add the "See what Marcus would have done" CTA and use the ticker from params.

**Step 1: Update the screen**

```tsx
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Text } from '@/components/primitives'
import { tokens } from '@/design/tokens'
import { api } from '@/lib/api/client'
import { useFtue } from '@/features/ftue/useFtue'

export default function FirstTradeMoment() {
  const router = useRouter()
  const { ticker, action, quantity, price } = useLocalSearchParams<{
    ticker?: string; action?: string; quantity?: string; price?: string
  }>()
  const { markStep } = useFtue()

  async function handleContinue() {
    try {
      await api.post('/users/ftue', { made_first_trade: true })
      markStep({ mission1_trade_done: true, first_trade_annotation_shown: true })
    } catch {
      // non-critical
    }
    router.replace('/(tabs)/')
  }

  function handleViewMarcus() {
    handleContinue()
    router.push('/agent/marcus-bull-chen')
  }

  return (
    <View style={styles.container}>
      <View style={styles.checkCircle}>
        <Text style={{ fontSize: 32, color: '#fff' }}>✓</Text>
      </View>
      <Text variant="heading" style={styles.heading}>First trade in the books.</Text>
      {ticker && action && quantity && price && (
        <Text variant="body" color="secondary" style={styles.summary}>
          {action.toUpperCase()} {quantity} {ticker} at ${parseFloat(price).toFixed(2)}
        </Text>
      )}

      {ticker && (
        <TouchableOpacity style={styles.marcusCta} onPress={handleViewMarcus}>
          <Text variant="label" style={{ color: tokens.colors.brand.default }}>
            See what Marcus would have done with {ticker} →
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.cta} onPress={handleContinue}>
        <Text variant="label" style={{ color: '#fff' }}>Start Trading</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing[6],
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: tokens.colors.brand.default,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing[6],
  },
  heading: { textAlign: 'center', marginBottom: tokens.spacing[3] },
  summary: { textAlign: 'center', marginBottom: tokens.spacing[6] },
  marcusCta: {
    backgroundColor: tokens.colors.bg.secondary,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing[4],
    marginBottom: tokens.spacing[4],
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.border.default,
  },
  cta: {
    backgroundColor: tokens.colors.brand.default,
    borderRadius: tokens.radii.lg,
    paddingVertical: tokens.spacing[4],
    paddingHorizontal: tokens.spacing[8],
    width: '100%',
    alignItems: 'center',
  },
})
```

Also update `trade/success.tsx` to pass ticker/action/quantity/price when redirecting to `first-trade-moment`:

```tsx
// In the checkFirstTrade function, replace:
router.replace('/trade/first-trade-moment')
// With:
router.replace({
  pathname: '/trade/first-trade-moment',
  params: { ticker, action, quantity, price }
})
```

**Step 2: Type-check and commit**

```bash
cd apps/mobile && npx tsc --noEmit
git add apps/mobile/app/trade/first-trade-moment.tsx apps/mobile/app/trade/success.tsx
git commit -m "feat: first-trade-moment — Marcus CTA, pass trade params"
```

---

## Task 12: Settings — notification toggles + typed DELETE

**Files:**
- Modify: `apps/mobile/app/(tabs)/portfolio.tsx`

The settings tab has a leaderboard toggle but is missing notification toggles and the typed "DELETE" account deletion confirmation.

**Step 1: Add notification preferences**

Add interface and query:

```tsx
interface NotificationPrefs {
  advisory_recommendations: boolean
  agent_reactions: boolean
  challenge_milestones: boolean
  portfolio_alerts: boolean
  recommendation_expiry: boolean
}
```

Add query alongside existing user query:

```tsx
const { data: notifPrefs } = useQuery<NotificationPrefs>({
  queryKey: ['notif-prefs'],
  queryFn: () => api.get<NotificationPrefs>('/users/me/notification-preferences'),
})

const { mutate: updateNotifPrefs } = useMutation({
  mutationFn: (patch: Partial<NotificationPrefs>) =>
    api.patch('/users/me/notification-preferences', patch),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notif-prefs'] }),
})
```

Add a Notifications section in the settings tab (after the Preferences section):

```tsx
<View style={styles.section}>
  <Text variant="label" color="secondary" style={styles.sectionTitle}>NOTIFICATIONS</Text>
  <View style={styles.card}>
    {([
      ['advisory_recommendations', 'Advisory recommendations'],
      ['agent_reactions', 'Agent reactions'],
      ['challenge_milestones', 'Challenge milestones'],
      ['portfolio_alerts', 'Portfolio alerts (5%+ moves)'],
      ['recommendation_expiry', 'Recommendation expiry'],
    ] as const).map(([key, label]) => (
      <View key={key} style={styles.switchRow}>
        <Text variant="body">{label}</Text>
        <Switch
          value={notifPrefs?.[key] ?? false}
          onValueChange={(val) => updateNotifPrefs({ [key]: val } as any)}
          trackColor={{ true: tokens.colors.brand.default, false: tokens.colors.bg.tertiary }}
        />
      </View>
    ))}
  </View>
</View>
```

**Step 2: Replace the Alert-based delete with typed confirmation**

Replace the Delete Account `Alert.alert` call with a proper typed confirmation:

```tsx
const [deleteInput, setDeleteInput] = useState('')
const [showDelete, setShowDelete] = useState(false)
```

Replace the Delete Account menu row:

```tsx
<TouchableOpacity style={styles.menuRow} onPress={() => setShowDelete((v) => !v)}>
  <Text variant="body" style={{ color: tokens.colors.error }}>Delete Account</Text>
  <Text variant="caption" color="secondary">›</Text>
</TouchableOpacity>
{showDelete && (
  <View style={{ marginTop: tokens.spacing[3] }}>
    <Text variant="caption" color="secondary" style={{ marginBottom: tokens.spacing[2] }}>
      Type DELETE to confirm. This cannot be undone.
    </Text>
    <TextInput
      style={styles.deleteInput}
      value={deleteInput}
      onChangeText={setDeleteInput}
      placeholder="DELETE"
      placeholderTextColor={tokens.colors.text.muted}
      autoCapitalize="characters"
    />
    <TouchableOpacity
      style={[styles.deleteBtn, deleteInput !== 'DELETE' && { opacity: 0.4 }]}
      disabled={deleteInput !== 'DELETE'}
      onPress={() => api.delete('/users/me')}
    >
      <Text variant="label" style={{ color: '#fff' }}>Delete my account</Text>
    </TouchableOpacity>
  </View>
)}
```

Add to styles:

```tsx
deleteInput: {
  backgroundColor: tokens.colors.bg.primary,
  borderRadius: tokens.radii.md,
  padding: tokens.spacing[3],
  color: tokens.colors.text.primary,
  marginBottom: tokens.spacing[2],
  borderWidth: 1,
  borderColor: tokens.colors.error,
},
deleteBtn: {
  backgroundColor: tokens.colors.error,
  borderRadius: tokens.radii.md,
  padding: tokens.spacing[3],
  alignItems: 'center',
},
```

Also add `TextInput` to the RN import at top.

**Step 3: Type-check and commit**

```bash
cd apps/mobile && npx tsc --noEmit
git add apps/mobile/app/(tabs)/portfolio.tsx
git commit -m "feat: settings — notification toggles, typed DELETE confirmation"
```

---

## Task 13: Force update screen + What's New bottom sheet

**Files:**
- Create: `apps/mobile/app/force-update.tsx`
- Modify: `apps/mobile/app/_layout.tsx`

**Step 1: Create force update screen**

Create `apps/mobile/app/force-update.tsx`:

```tsx
import { View, StyleSheet, TouchableOpacity, Linking } from 'react-native'
import { Text } from '@/components/primitives'
import { tokens } from '@/design/tokens'
import { Platform } from 'react-native'

const STORE_URL = Platform.OS === 'ios'
  ? 'https://apps.apple.com/app/mockket'
  : 'https://play.google.com/store/apps/details?id=com.mockket'

export default function ForceUpdate() {
  return (
    <View style={styles.container}>
      <Text variant="heading" style={styles.title}>Update Required</Text>
      <Text variant="body" color="secondary" style={styles.body}>
        This version of Mockket is no longer supported. Update to keep trading.
      </Text>
      <TouchableOpacity style={styles.cta} onPress={() => Linking.openURL(STORE_URL)}>
        <Text variant="label" style={{ color: '#fff' }}>Update Now</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing[8],
  },
  title: { textAlign: 'center', marginBottom: tokens.spacing[4] },
  body: { textAlign: 'center', lineHeight: 24, marginBottom: tokens.spacing[8] },
  cta: {
    backgroundColor: tokens.colors.brand.default,
    borderRadius: tokens.radii.lg,
    paddingVertical: tokens.spacing[4],
    paddingHorizontal: tokens.spacing[8],
  },
})
```

**Step 2: Add version check to root layout**

Add version check logic in `AuthGate`. After session check resolves, fetch `/config/app-version` and redirect to `force-update` if needed:

```tsx
// Add inside AuthGate, after session effect:
useEffect(() => {
  async function checkVersion() {
    try {
      const config = await fetch('/config/app-version').then(r => r.json())
      const platform = Platform.OS === 'ios' ? config.ios : config.android
      const currentVersion = '1.0.0' // expo-constants Application.nativeApplicationVersion in real build
      if (platform?.updateMode === 'hard') {
        router.replace('/force-update')
      }
    } catch {
      // ignore — don't block launch on version check failure
    }
  }
  if (session) checkVersion()
}, [session])
```

**Step 3: Type-check and commit**

```bash
cd apps/mobile && npx tsc --noEmit
git add apps/mobile/app/force-update.tsx apps/mobile/app/_layout.tsx
git commit -m "feat: force update screen + version check on launch"
```

---

## Task 14: Backend — `/activity` endpoint

**Files:**
- Create: `packages/api/src/routes/activity.ts`
- Modify: `packages/api/src/index.ts`

The Activity tab calls `GET /activity`. Add this endpoint returning the user's recent trades + agent trades + dividends merged and sorted by time.

**Step 1: Create route**

```typescript
// packages/api/src/routes/activity.ts
import { Router } from 'express'
import { pool } from '../db/client'

export const activityRouter = Router()

activityRouter.get('/', async (req, res) => {
  const userId = (req as any).user.id
  try {
    const { rows } = await pool.query(
      `SELECT
         t.id,
         CASE WHEN t.agent_id IS NULL THEN 'trade' ELSE 'agent_trade' END AS type,
         t.agent_id,
         t.ticker,
         t.action,
         t.quantity,
         t.price_at_execution AS price,
         (t.quantity * t.price_at_execution) AS total,
         t.rationale AS quote,
         t.executed_at AS created_at
       FROM trades t
       WHERE t.user_id = $1
       ORDER BY t.executed_at DESC
       LIMIT 50`,
      [userId]
    )
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Failed to load activity' })
  }
})
```

**Step 2: Register in index.ts**

Find the route registrations in `packages/api/src/index.ts` and add:

```typescript
import { activityRouter } from './routes/activity'
// ...
app.use('/activity', requireAuth, activityRouter)
```

**Step 3: Type-check and commit**

```bash
cd packages/api && npx tsc --noEmit
git add packages/api/src/routes/activity.ts packages/api/src/index.ts
git commit -m "feat: add GET /activity endpoint for activity feed"
```

---

## Verification

After all tasks complete, run a full type-check:

```bash
cd apps/mobile && npx tsc --noEmit && echo "Mobile: OK"
cd packages/api && npx tsc --noEmit && echo "API: OK"
```

Manual verification checklist:
- [ ] Unauthenticated user lands on Welcome screen
- [ ] Sign up creates account → lands on Home with portfolio value
- [ ] Markets list shows prices → tap → Trade screen → Confirmation → FTUE annotation visible on first trade → Success → First-trade-moment with Marcus CTA
- [ ] Agents tab shows Marcus + Priya → Hire flow works → color ring visible
- [ ] Challenges tab → New Challenge → vs Friend shows username search
- [ ] Active challenge → Detail shows live standings → Forfeit works
- [ ] Completed challenge → Recap → "See where it slipped away" expands autopsy
- [ ] Activity tab shows trade history feed
- [ ] Portfolio tab → Settings tab → notification toggles work → DELETE confirmation requires typing
- [ ] Tab bar active color is emerald green (not indigo)
