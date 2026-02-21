# Mobile Screens Design — Mockket
Date: 2026-02-20

## Overview

Build all MVP mobile screens using Expo Router v4 file-based routing. Follows the existing web prototype visual design (dark slate + emerald green, design tokens in `apps/mobile/src/design/tokens/`). All screens wire to existing hooks and API routes — no new backend work required.

---

## Approach

**Option A — Expo Router file-system routing.** Routes are implicit from the file tree. Tab bar, stack navigators, and modals come from Expo Router's layout system. Screens land as working routes immediately; no separate wiring pass needed.

---

## Navigation Structure

```
app/
├── _layout.tsx                  # Root layout — auth gate, QueryClient, Zustand
├── (auth)/
│   ├── _layout.tsx              # Stack, no tab bar
│   ├── welcome.tsx              # 3-step onboarding carousel
│   ├── sign-in.tsx
│   └── sign-up.tsx
├── (tabs)/
│   ├── _layout.tsx              # Tab bar (Home, Markets, Agents, Challenges, Activity)
│   ├── index.tsx                # Home
│   ├── markets/
│   │   ├── index.tsx            # Markets list + search
│   │   └── [ticker].tsx         # Stock/crypto detail + trade entry
│   ├── agents/
│   │   ├── index.tsx            # Agent marketplace
│   │   └── [agentId]/
│   │       ├── index.tsx        # Agent profile + trade log
│   │       └── hire.tsx         # Hire / withdraw / pause flow
│   ├── challenges/
│   │   ├── index.tsx            # Active challenges + leaderboard
│   │   ├── new.tsx              # Challenge creation wizard
│   │   └── [challengeId]/
│   │       ├── index.tsx        # Active challenge detail
│   │       └── recap.tsx        # Post-challenge recap + autopsy
│   └── activity.tsx             # Activity feed
├── trade/
│   ├── confirm.tsx              # Trade confirmation modal
│   └── post-first.tsx           # Post-first-trade moment (FTUE)
├── recommendation/
│   └── [id].tsx                 # Advisory recommendation approval modal
└── settings/
    └── index.tsx                # Settings
```

**Modal presentation:** `trade/confirm`, `trade/post-first`, `recommendation/[id]`, and `agents/[agentId]/hire` use Expo Router `presentation: 'modal'`. Paywall and What's New bottom sheet are in-screen components (not separate routes).

**Auth gate:** Root `_layout.tsx` reads Zustand auth store (populated by `useSession`). Redirects unauthenticated users to `(auth)/welcome`, authenticated users to `(tabs)`.

---

## Screens

### Auth / Onboarding

**`(auth)/welcome.tsx`**
Three-step carousel, no back nav.
- Step 1: Mockket logo, "Outthink the AI. Learn why you lost.", Get Started
- Step 2: Three icon+text bullets (paper trading / AI agents / trade comparison), Skip option
- Step 3: "Marcus wants to send you trade tips." Allow / Not Now — triggers OS permission prompt
After step 3 → sign-up.

**`(auth)/sign-in.tsx` / `sign-up.tsx`**
Email + password fields. Apple SSO + Google SSO buttons. Inline error messages. On success → root layout redirects to `(tabs)`.

---

### Home tab (`(tabs)/index.tsx`)

- Portfolio value (large tabular num) + day change (`+$X / +X.XX%`) + sparkline
- FTUE Mission 1 cards pinned at top (from `useFtue`) until all 3 complete
- Day 2 card if: user is on day 2 AND no challenge started ("Marcus is up X.X% since you joined. Are you ahead?")
- Active challenge card with live countdown + standings (glow border)
- Agent activity feed: hired agents' recent trades with in-character quote
- Leaderboard preview: top 5 rows (tappable → Challenges tab leaderboard)
- Soft update banner if applicable
- Empty states per PRD

---

### Markets tab

**`(tabs)/markets/index.tsx`**
- Market status pill (OPEN / CLOSED / PRE-MARKET / AFTER-HOURS) pinned top-right
- Search bar
- Watchlist section: user's holdings + watched tickers
- All Markets section: stocks then crypto
- Each row: ticker, name, mid price, day change %, 40px sparkline, earnings badge (if reporting ≤7 days)

**`(tabs)/markets/[ticker].tsx`**
- Large price + bid row + ask row + day chart
- Buy / Sell buttons → navigate to `trade/confirm` modal
- About section, key stats (market cap, P/E, dividend yield)
- Earnings date badge
- Position alert opt-in toggle

---

### Agents tab

**`(tabs)/agents/index.tsx`**
- Filter chips: All / Stocks / Crypto / risk level
- Agent cards: color ring + glow, name, strategy, win rate bar, return %, trade count, AUM, Hire / Hired badge
- Taps to `agents/[agentId]`

**`(tabs)/agents/[agentId]/index.tsx`**
- Avatar with signature color ring + glow
- Personality blurb
- All-time return vs user's all-time return (running comparison)
- Win rate, trade count
- Full trade log: timestamp, ticker, action, qty, price, in-character rationale (terms underlined → tooltip)
- Hire CTA at bottom

**`(tabs)/agents/[agentId]/hire.tsx`** (modal)
- Allocation input: slider + text field, $1,000 min, 50% of available cash max
- Mode toggle: Advisory (default) / Autopilot (premium gate for free users)
- Confirm / Cancel
- If already hired: shows Pause / Withdraw controls with confirmation sheet on Withdraw

---

### Challenges tab

**`(tabs)/challenges/index.tsx`**
- Active challenges: cards with opponent avatar, live % standings, days/hours left countdown, glow border
- New Challenge FAB → `challenges/new`
- Challenge history: completed/forfeited entries, W/L badge, tappable → recap
- Full leaderboard: top 50 by 30-day return, user's rank shown below top 50 if not ranked, opt-in note

**`(tabs)/challenges/new.tsx`**
- Step 1: vs Agent or vs Friend
- Step 2a (vs Agent): pick agent card, pick duration (1w / 1m), pick starting balance
- Step 2b (vs Friend): username search OR copy shareable link
- Step 3: summary confirm → creates challenge → back to Challenges tab

**`(tabs)/challenges/[challengeId]/index.tsx`**
- Live standings card (user vs opponent %)
- Challenge portfolio holdings
- Trade log for this challenge period
- Forfeit button → confirmation bottom sheet

**`(tabs)/challenges/[challengeId]/recap.tsx`**
- Winner banner (or tie)
- % return comparison (user vs opponent)
- Key trades that decided the outcome (1–3 highlighted)
- Agent in-character reaction quote
- "See where it slipped away" / "See what worked" CTA → inline autopsy expand (3 pivotal moments, plain-language takeaway per moment)

---

### Activity tab (`(tabs)/activity.tsx`)

Chronological feed items:
- Agent trade (avatar, ticker, action, qty, price, rationale quote)
- User trade
- Dividend credit ("$JNJ dividend — $3.20 credited")
- Stock split notice
- Agent reaction to user trade (in-character blurb)
- Loss reflection card (once after a loss: "You lost by X%. Want to see the 3 moments that mattered most?")

---

### Trade confirm modal (`trade/confirm.tsx`)

- Header: ticker + Buy / Sell
- Quantity input
- Price block: mid price, execution price (ask/bid clearly labelled), spread
- Market status warning if closed: "Market is closed. Your order will execute at next market open."
- FTUE annotations on first trade: inline labels below bid/ask and execution price (shown once, from `useFtue`)
- "Ask Marcus" row (if agent hired): tap → inline in-character response, no nav
- PDT banner at 2 day trades ("2 of 3 day trades used this week"), amber at 3
- Slippage estimate for illiquid assets
- Confirm button → on success: if first-ever trade → `trade/post-first`, else toast + back

**`trade/post-first.tsx`** (full-screen modal)
- "First trade in the books."
- Trade summary (ticker, action, qty, price)
- "See what Marcus would have done with [ticker] →" CTA → Marcus's trade log filtered to ticker
- Dismiss → back to Markets

---

### Recommendation modal (`recommendation/[id].tsx`)

- Agent avatar + name
- Ticker, action, quantity
- Rationale hidden: "See reasoning after you act"
- Approve / Reject buttons
- Post-action: rationale revealed, "Why does [concept] matter?" inline link (if concept has explainer)
- Expired state: card grayed, buttons hidden, "Expired" badge

---

### Settings (`settings/index.tsx`)

Sections:
- **Account:** display name (editable), email (read-only), subscription status + upgrade CTA, reset count
- **Privacy:** leaderboard toggle (off by default)
- **Notifications:** advisory recommendations, agent reactions, challenge milestones, portfolio alerts, recommendation expiry
- **App:** What's New (changelog), Rate Mockket, Privacy Policy, Terms of Service
- **Danger Zone:** Delete account (type "DELETE" to confirm)

Entry point: gear icon in Home/Portfolio tab header.

---

### System screens

**Force update:** Full-screen, no dismiss. "Update Required" title. "Update Now" CTA deep-links to App/Play Store.

**What's New bottom sheet:** Triggered on first launch after version bump. Version + date, entries grouped New / Improved / Fixed. "Got it" dismiss. Also accessible at Settings > App > What's New.

---

## Shared components needed

Beyond existing primitives (Box, Stack, Text):
- `Sparkline` — SVG line + gradient fill, green/red by direction
- `RiskBadge` — pill with color by level (low/medium/high/degen)
- `AgentAvatar` — circular image with color ring + glow
- `MarketStatusPill` — OPEN / CLOSED / PRE-MARKET / AFTER-HOURS
- `PriceChange` — `+X.XX%` / `-X.XX%` with color and sign
- `TabularNum` — Text wrapper enforcing tabular-nums
- `SectionLabel` — uppercase muted 11px label
- `GlowCard` — Card with `box-shadow: 0 0 20px rgba(16,185,129,0.15)`
- `BottomSheet` — for paywall, What's New, hire confirm, forfeit confirm

---

## Visual rules (from VISUAL_THEME.md)

- Dark only. Base `#0F172A`, cards `#1E293B`, elevated `#243044`.
- Single accent: emerald `#10B981`. Never introduce a second accent.
- Tabular nums on all prices and percentages.
- Positive prefix `+`, negative prefix `-`. Color alone never conveys direction.
- Card: `border-radius: 12px`, `border: 1px solid #334155`. Always bordered.
- Glow cards sparingly (1–2 per screen max).
- No bounce animations. Sheets slide up 300ms ease-out. Tab indicator slides 200ms.

---

## Data wiring

All screens use existing hooks:
- `usePortfolio`, `useAgents`, `usePrices`, `useLivePrices`, `useEarnings` (mobile)
- `useSession`, `useFtue` (auth + FTUE state)
- `usePremium` (paywall gate)
- TanStack Query for all server state, Zustand for auth + FTUE flags

No new API endpoints required for MVP screens.
