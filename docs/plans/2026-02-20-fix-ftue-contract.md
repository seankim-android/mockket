# FTUE Contract Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the FTUE client/server field name mismatch so Mission cards, first-trade moment, and agent intro all work end-to-end.

**Architecture:** After the last PR, `GET /users/ftue` returns camelCase (`viewedMarcusProfile`, `madeFirstTrade`, etc.), but `useFtue.ts` still queries `/ftue` (wrong path), uses the old `mission1_*` field names in its interface, and sends camelCase to a PATCH endpoint that only accepts snake_case. We fix this in 4 targeted edits: (1) server PATCH accepts camelCase, (2) client hook uses correct paths + interface, (3) MissionCards uses new field names, (4) first-trade-moment uses PATCH not POST.

**Tech Stack:** TypeScript, Node.js/Express, React Native (Expo Router), @tanstack/react-query

---

### Task 1: Fix server PATCH /users/ftue to accept camelCase field names

**Files:**
- Modify: `packages/api/src/routes/users.ts:119-135`

**Context:** The GET endpoint returns camelCase. The PATCH endpoint currently only accepts snake_case keys (`viewed_marcus_profile`, etc.). After this fix it accepts camelCase (`viewedMarcusProfile`, etc.) and maps them to DB column names internally.

**Step 1: Replace ALLOWED_FTUE_FIELDS with a camelCase→dbColumn map**

In `packages/api/src/routes/users.ts`, replace lines 119–135:

```typescript
// BEFORE:
const ALLOWED_FTUE_FIELDS = new Set([
  'viewed_marcus_profile', 'made_first_trade', 'started_challenge',
  'agent_intro_sent', 'first_trade_annotation_shown', 'day2_card_shown'
])

// PATCH /users/ftue — update FTUE progress
usersRouter.patch('/ftue', requireAuth, async (req, res) => {
  const userId = res.locals.userId
  const fields = req.body as Record<string, unknown>

  const safeEntries = Object.entries(fields).filter(([k]) => ALLOWED_FTUE_FIELDS.has(k))

  if (safeEntries.length === 0) {
    return res.status(400).json({ error: 'No valid fields provided' })
  }

  const setClauses = safeEntries
    .map(([k], i) => `${k} = $${i + 2}`)
    .join(', ')

  await db.query(
    `UPDATE ftue_progress SET ${setClauses} WHERE user_id = $1`,
    [userId, ...safeEntries.map(([, v]) => v)]
  )

  res.json({ ok: true })
})
```

Replace with:

```typescript
// Maps camelCase client keys → snake_case DB column names
const FTUE_FIELD_MAP: Record<string, string> = {
  viewedMarcusProfile: 'viewed_marcus_profile',
  madeFirstTrade: 'made_first_trade',
  startedChallenge: 'started_challenge',
  agentIntroSent: 'agent_intro_sent',
  firstTradeAnnotationShown: 'first_trade_annotation_shown',
  day2CardShown: 'day2_card_shown',
}

// PATCH /users/ftue — update FTUE progress
usersRouter.patch('/ftue', requireAuth, async (req, res) => {
  const userId = res.locals.userId
  const fields = req.body as Record<string, unknown>

  const safeEntries = Object.entries(fields)
    .filter(([k]) => k in FTUE_FIELD_MAP)
    .map(([k, v]) => [FTUE_FIELD_MAP[k], v] as [string, unknown])

  if (safeEntries.length === 0) {
    return res.status(400).json({ error: 'No valid fields provided' })
  }

  const setClauses = safeEntries
    .map(([col], i) => `${col} = $${i + 2}`)
    .join(', ')

  await db.query(
    `UPDATE ftue_progress SET ${setClauses} WHERE user_id = $1`,
    [userId, ...safeEntries.map(([, v]) => v)]
  )

  res.json({ ok: true })
})
```

**Step 2: Run typecheck**

```bash
cd packages/api && npx tsc --noEmit
```
Expected: 0 errors.

**Step 3: Commit**

```bash
git add packages/api/src/routes/users.ts
git commit -m "fix: PATCH /users/ftue accepts camelCase field names"
```

---

### Task 2: Fix useFtue hook — paths and interface

**Files:**
- Modify: `apps/mobile/src/features/ftue/useFtue.ts`

**Context:** The hook queries `/ftue` (should be `/users/ftue`) and has a `FtueProgress` interface with `mission1_*` keys that don't match the API's camelCase response. Fix both.

**Step 1: Rewrite useFtue.ts**

Replace the entire file content:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export interface FtueProgress {
  viewedMarcusProfile: boolean
  madeFirstTrade: boolean
  startedChallenge: boolean
  firstTradeAnnotationShown: boolean
  agentIntroSent: boolean
  day2CardShown: boolean
}

export function useFtue() {
  const queryClient = useQueryClient()

  const { data: progress, isLoading } = useQuery<FtueProgress>({
    queryKey: ['ftue'],
    queryFn: () => api.get<FtueProgress>('/users/ftue'),
    staleTime: 60_000,
  })

  const { mutate: markStep } = useMutation({
    mutationFn: (patch: Partial<FtueProgress>) => api.patch('/users/ftue', patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: ['ftue'] })
      const prev = queryClient.getQueryData<FtueProgress>(['ftue'])
      queryClient.setQueryData<FtueProgress>(['ftue'], (old) =>
        old ? { ...old, ...patch } : (patch as FtueProgress)
      )
      return { prev }
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['ftue'], ctx.prev)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['ftue'] }),
  })

  const allMissionsComplete = progress
    ? progress.viewedMarcusProfile &&
      progress.madeFirstTrade &&
      progress.startedChallenge
    : false

  // Day 2: user created account yesterday or earlier and no challenge yet
  function shouldShowDay2Card(createdAt?: string): boolean {
    if (!createdAt || progress?.day2CardShown || progress?.startedChallenge) return false
    const created = new Date(createdAt)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays >= 1
  }

  return { progress, isLoading, markStep, allMissionsComplete, shouldShowDay2Card }
}
```

**Step 2: Run typecheck**

```bash
cd apps/mobile && npx tsc --noEmit
```
Expected: 0 errors (or same errors as before — don't introduce new ones).

**Step 3: Commit**

```bash
git add apps/mobile/src/features/ftue/useFtue.ts
git commit -m "fix: align useFtue paths and field names with API"
```

---

### Task 3: Fix MissionCards to use new field names

**Files:**
- Modify: `apps/mobile/src/features/ftue/MissionCards.tsx`

**Context:** MissionCards uses `progress.mission1_agent_viewed`, `progress.mission1_trade_done`, `progress.mission1_challenge_done` and calls `markStep` with old keys. Update to match the new FtueProgress interface.

**Step 1: Update field references and markStep calls**

In `MissionCards.tsx`, make these replacements:

1. `done: progress.mission1_agent_viewed,` → `done: progress.viewedMarcusProfile,`
2. `markStep({ mission1_agent_viewed: true })` → `markStep({ viewedMarcusProfile: true })`
3. `done: progress.mission1_trade_done,` → `done: progress.madeFirstTrade,`
4. `done: progress.mission1_challenge_done,` → `done: progress.startedChallenge,`
5. `markStep({ day2_card_shown: true })` → `markStep({ day2CardShown: true })`

**Step 2: Run typecheck**

```bash
cd apps/mobile && npx tsc --noEmit
```
Expected: 0 errors.

**Step 3: Commit**

```bash
git add apps/mobile/src/features/ftue/MissionCards.tsx
git commit -m "fix: MissionCards field names match new FtueProgress interface"
```

---

### Task 4: Fix first-trade-moment.tsx — POST → PATCH and field names

**Files:**
- Modify: `apps/mobile/app/trade/first-trade-moment.tsx`

**Context:** `first-trade-moment.tsx` calls `api.post('/users/ftue', ...)`. There is no POST endpoint — it should be `api.patch('/users/ftue', ...)`. Also, the `markStep` calls use old `mission1_*` field names.

**Step 1: Fix handleContinue**

Replace:
```typescript
async function handleContinue() {
  try {
    await api.post('/users/ftue', { made_first_trade: true })
    markStep({ mission1_trade_done: true, first_trade_annotation_shown: true })
  } catch {
    // non-critical
  }
  router.replace('/(tabs)/')
}
```

With:
```typescript
async function handleContinue() {
  try {
    markStep({ madeFirstTrade: true, firstTradeAnnotationShown: true })
  } catch {
    // non-critical
  }
  router.replace('/(tabs)/')
}
```

(The `markStep` mutation now handles the PATCH internally — no need for a separate `api.patch` call.)

**Step 2: Fix handleViewMarcus**

Replace:
```typescript
async function handleViewMarcus() {
  try {
    await api.post('/users/ftue', { made_first_trade: true })
    markStep({ mission1_trade_done: true, first_trade_annotation_shown: true })
  } catch {
    // non-critical
  }
  router.replace('/agent/marcus-bull-chen')
}
```

With:
```typescript
async function handleViewMarcus() {
  try {
    markStep({ madeFirstTrade: true, firstTradeAnnotationShown: true })
  } catch {
    // non-critical
  }
  router.replace('/agent/marcus-bull-chen')
}
```

**Step 3: Remove unused `api` import if no longer used**

Check if `api` is still imported and used elsewhere in the file. If the only usages were the `api.post` calls, remove the import line:
```typescript
import { api } from '@/lib/api/client'
```

**Step 4: Run typecheck**

```bash
cd apps/mobile && npx tsc --noEmit
```
Expected: 0 errors.

**Step 5: Run tests**

```bash
cd packages/api && npx jest --verbose
```
Expected: all passing.

**Step 6: Commit**

```bash
git add apps/mobile/app/trade/first-trade-moment.tsx
git commit -m "fix: first-trade-moment uses markStep not api.post, camelCase fields"
```

---

### Task 5: Update CLAUDE.md checklist

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Mark all 12 previously-unchecked items as complete**

In `CLAUDE.md`, update the MVP Checklist section. Replace all `[ ]` with `[x]` for the 12 items previously marked broken/missing. Remove the inline error annotations (everything after the `—` on those lines).

Updated checklist should read:

```markdown
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
- [x] Challenge cash ledger
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
- [x] Agent reactions (max 1/day: triggers on >3% portfolio trade or agent-held ticker)
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: mark all MVP items complete"
```
