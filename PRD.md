# PRD: Mockket — AI Trading Agent Marketplace

## Overview

Mockket is a mobile app where users trade with $100,000 in paper cash against real market prices — and compete against AI trading agents with real track records. Each agent has a name, personality, and strategy, and has been running against live markets since before you arrived. Users can trade manually, hire agents to manage portions of their portfolio, or do both. The core loop: outperform the agents, then figure out why you didn't.

---

## Problem

Paper trading apps are boring because there's nothing at stake and nothing to compete against. Investment education apps are dry. Mockket combines the engagement of competition with learn-by-doing paper trading, wrapped in a character-driven marketplace that makes finance feel approachable and fun.

---

## Target Users

**Primary:** Beginner to intermediate investors (18-35) who want to learn without risking real money and enjoy competitive or game-like experiences.

**Secondary:** Finance enthusiasts and experienced traders who want to test strategies or mess around with crypto without consequences.

---

## Core Concepts

**Paper Portfolio** — Every user starts with $100,000 in fake cash. They can trade US stocks and crypto with real-time prices. P&L, trade history, and performance are tracked across the lifetime of the account.

**AI Agents** — Named characters with distinct strategies, personalities, and live track records built from actual performance data over time. Users can hire agents to manage a portion of their portfolio autonomously, receive trade recommendations from them in advisory mode, or simply compete against them in challenges.

**Challenges** — Fixed-duration competitions (1 week, 1 month, 3 months) where users pit their portfolio against an agent or another user. Winner is whoever has higher % returns at the end. Short challenges (1 week) are designed for fast feedback loops; longer ones for sustained competition.

**Agent Marketplace** — A browsable roster of agents with profile cards showing strategy, personality, track record, risk profile, and current availability. Popular agents with strong track records can have limited slots, creating organic scarcity.

**Portfolio Reset** — Users can reset their portfolio balance back to $100,000 for a small in-app purchase. Challenge history and trade logs are never wiped — only the balance resets. This keeps the leaderboard meaningful and makes resets a deliberate decision rather than an escape hatch.

**Agent Logs & Performance Analysis** — Every agent exposes a full trade log with timestamps, execution prices, and in-character rationale for each move. Users can view a side-by-side comparison of their trades vs the agent's trades over any challenge period, with outcome annotations showing how each decision played out. This is the primary educational feature of the app.

---

## Agent Roster (V1)

**Marcus "The Bull" Chen**
Momentum trader. Chases high-volume breakouts in stocks and crypto. High risk, high reward. Has a 3-month winning streak and two catastrophic blowups on record. Talks trash in push notifications. Log style: "Volume spike on $NVDA, classic breakout setup, went in heavy."

**Priya Sharma**
Value investor. Buffett-style fundamentals, long holds, low turnover. Boring and consistent. Never lost more than 8% in a quarter. Will flag when your trades look speculative. Log style: "P/E came down to an attractive entry point after the pullback, initiated a 5% position."

**HODL Hannah**
Crypto only. Buys BTC and ETH and never sells regardless of price action. Zero trades, maximum conviction. Log style: "Still holding. Always holding."

**The Quant**
Algorithm-driven. Rebalances based on technical indicators (RSI, MACD, moving averages). No personality, just math. Unnerving win rate during low-volatility periods, struggles in chaos. Log style: "RSI crossed 30, mean reversion signal triggered, 3% position opened."

**The Degen**
Altcoins and memecoins only. Completely unhinged strategy. Huge following among users who want chaos. Performance history is a rollercoaster. Log style: "Aping in. No further comment."

**Elena "The Steady" Park**
Dividend-focused. Builds income-generating portfolios with blue chip stocks. Slow growth, almost never in the red. Appeals to users who want to see compounding in action. Log style: "Added to $JNJ position. Dividend yield at 3.2%, consistent payer for 40+ years."

New agents are added over time. Some are time-limited or event-driven (e.g., an agent that only trades during earnings season).

---

## Features

### Portfolio Management

Users have one master portfolio split into segments: self-managed and agent-managed. They allocate fake cash to agents at hire time and can withdraw or pause at any time. All segments roll up into a single portfolio view with total P&L and breakdown by segment.

### Hiring an Agent

User browses the marketplace, views an agent's profile and track record, and allocates a dollar amount (minimum $1,000, maximum 50% of available cash). The agent runs in one of two modes:

- **Advisory mode (default):** Agent sends up to one trade recommendation per day via push notification. User approves or rejects each trade blind — the agent's reasoning is not shown until after the user acts and is visible in the trade log. Recommendations expire after 24 hours if not acted on.
- **Autopilot mode (premium):** Agent trades autonomously on its rebalancing schedule. User can override or pause at any time.

If a user resets their portfolio, all agent hires are automatically paused. The user must manually re-confirm each hire to restart it.

### Real-Time Trading

Live stock prices via Alpaca API during market hours. Live crypto prices 24/7 via Alpaca's crypto endpoints. WebSocket connections for real-time price updates. Agent portfolios rebalance on a schedule — every 6 hours for crypto, once daily for stocks in V1.

### Trading Realism

The paper trading experience mirrors how real markets work. Realism is not about complexity — it is about removing the moments that break immersion and remind users the stakes are fake.

**Market hours**

Stocks trade Monday–Friday 9:30am–4:00pm ET. Pre-market (4:00am–9:30am) and after-hours (4:00pm–8:00pm) data is visible but trading is restricted to market hours in V1. Crypto trades 24/7 with no restrictions.

Order behavior outside market hours:
- Orders submitted after hours are queued and execute at the next market open.
- The confirmation screen shows: *"Market is closed. Your order will execute at the next market open."*
- Queued orders can be cancelled before market open.
- A market status indicator (OPEN / CLOSED / PRE-MARKET / AFTER-HOURS) is visible on the Markets screen and the Trade screen at all times.

**Bid/ask spread**

Every stock and crypto asset has a bid (sell) price and an ask (buy) price. The spread between them is real cost.

- Buy orders execute at the ask price.
- Sell orders execute at the bid price.
- The order confirmation screen shows both bid and ask, with the execution price clearly labelled ("You buy at the ask").
- The displayed price on the Markets screen is the mid price. Switching to the Trade screen shows the actual execution price.

This is the single most important realism feature. Paper trading apps that execute at mid price create unrealistic P&L expectations.

**Market order execution**

Market orders do not guarantee the price shown. The confirmation screen states: *"Fills at next available ask price. Final price may differ slightly from the quote above."*

In practice, for liquid stocks and BTC/ETH, the slippage is negligible. For illiquid names, a slippage estimate is shown based on the asset's average spread.

**Pattern Day Trader (PDT) warning**

US regulations define a Pattern Day Trader as anyone who executes 4 or more day trades in a 5-business-day window with an account under $25,000. Mockket does not enforce this rule — paper accounts are exempt — but it surfaces the warning when a user approaches the threshold:

- At 2 day trades in a 5-day window: a small informational banner: *"2 of 3 day trades used this week. PDT rule applies to real accounts under $25k."*
- At 3 day trades: banner becomes amber with a link to a short explainer.
- The warning is educational only. It never blocks a trade.

**Dividends**

When a user holds a stock on its ex-dividend date, the dividend amount is credited to their paper cash balance. The Home activity feed shows a line item: *"$JNJ dividend — $3.20 credited."* Agents' portfolios receive dividends too, which affects their reported returns.

Dividend yield is displayed on stock detail pages.

**Stock splits**

When a held stock splits, share quantity and cost basis are adjusted automatically. The activity feed notes the split. No user action required.

**Earnings calendar**

The Markets screen and stock detail pages display upcoming earnings dates for any stock. A "Reporting earnings in X days" badge appears on the stock card when an earnings date is within 7 days. Agents' trade rationale logs reference upcoming earnings when relevant (e.g. Priya: *"Holding through earnings — balance sheet is clean."*).

### Challenges

Users start a challenge against any agent or another user. Fixed durations: 1 week, 1 month, 3 months (1-week and 1-month in MVP). The user allocates a cash amount from their main portfolio — this creates a separate challenge portfolio for the duration of the competition. The winner is whoever achieves the higher % return by the end date.

**Agent challenges:** The agent competes on its own separate simulated portfolio starting at the same balance. Advisory mode recommendations from hired agents can apply to the user's challenge portfolio.

**Friend challenges (MVP):** Users can challenge another Mockket user directly by sending them a challenge invite (shareable link or in-app username search). Both sides start with the same balance for the same duration. The challenged user must accept within 24 hours or the invite expires. Friend challenges appear in both users' challenge history. No premium required — friend challenges are free tier.

Users can exit a challenge early; doing so records it as a forfeit/loss in their challenge history. Portfolio resets are blocked while any challenge is active.

**Leaderboard:** The Challenges tab includes a public leaderboard of the top 50 users by 30-day rolling % return on their main portfolio. A preview of the top 5 is visible on the Home screen to all users. Appearing on the leaderboard is opt-in (toggle in Settings, off by default) — users who haven't opted in are shown as anonymous placeholders. The leaderboard is visible to everyone regardless of opt-in status; only appearing on it requires opting in.

End-of-challenge recap screen breaks down who won, what trades decided it, and the agent's in-character reaction to the outcome.

### Agent Logs & Trade Comparison

Each agent exposes a complete trade log showing every action taken: timestamp, ticker, order type, price at execution, position size, and in-character rationale. Users can pull up a side-by-side view comparing their trades to the agent's trades over any challenge period. Each trade is annotated with outcome data — how much was made or lost, and how it compared to what the other side did at the same moment. This is the core learning feature.

Each hired agent's profile also shows the user's all-time return vs that agent's all-time return — a running answer to "am I actually beating this thing?" Advisory mode users on premium see a recommendation outcome split: of the recommendations they accepted vs ignored, which set performed better and by how much. This is intentionally surfaced only post-hoc, never before the user acts.

### Education

Mockket's educational value is a byproduct of the core loop, not a separate mode. The design principle: surface one concept exactly when it's relevant, never force it, never lecture. Users learn by competing, not by studying.

**Contextual concept cards**

When a user takes an action that has a teachable moment attached, a dismissible one-line card appears inline — never as a modal, never blocking the flow. Examples:

- User buys a stock 1–2 days before its earnings date: *"Earnings in 2 days. Stocks often move sharply after reporting — this is called earnings risk."*
- User holds a losing position for 14+ days without adding or selling: *"Holding a loser this long can sometimes signal loss aversion — the tendency to avoid realizing a loss even when selling is the right move."*
- User makes their 2nd day trade in a 5-day window: *"Day trading frequently in a real account under $25k triggers the PDT rule. It doesn't apply here, but it's worth knowing."*
- User's portfolio is more than 60% in a single sector: *"Your portfolio is heavily concentrated in one sector. Diversification spreads risk across industries."*

Cards are shown at most once per concept per user. They are never shown mid-flow — only after an action completes or on the relevant screen at rest.

**Agent rationale as active teaching**

After the post-trade reveal of an agent's rationale, a one-tap link appears beneath it: *"Why does [concept] matter?"* — e.g. "Why does P/E ratio matter?" or "What is a moving average?" Tapping opens a 3-sentence inline explainer. Depth on demand, never forced. The link only appears when the rationale contains a concept that has a registered explainer; not every rationale generates one.

**In-context glossary**

Financial terms are underlined wherever they appear in the app — in agent rationale logs, trade comparison annotations, stock detail pages, and analytics screens. Tapping any underlined term shows a 2-sentence definition in a small tooltip. No navigation away from the current screen.

Terms covered at minimum: bid/ask spread, P/E ratio, market cap, day trade, short selling, dividend, ex-dividend date, earnings per share, moving average, RSI, MACD, Sharpe ratio, max drawdown, beta, sector exposure.

**"What would [Agent] do?" pre-trade check**

On the trade confirmation screen, users with a hired agent can optionally tap *"Ask [Agent]"* before confirming. The agent responds in character with a brief reaction to the proposed trade — based on the ticker and position size relative to the user's portfolio. This is not advisory mode (which pushes recommendations proactively); this is a passive second opinion the user must opt into. Response is generated from the agent's rule-based logic. Examples: Marcus: "Small position on a breakout name — I'd go bigger, but I get it." Priya: "That P/E is stretched. I'd wait for a pullback." The response does not change based on whether the user proceeds.

This feature is available to all users with at least one hired agent. It does not count against the advisory recommendation daily limit.

**Post-challenge autopsy**

After every completed or forfeited challenge, a detailed autopsy is available from the challenge history screen. It identifies the 1–3 trades that most influenced the outcome — the moments where the divergence was decided. For each moment, it shows: what the user did, what the agent did at the same time, and the outcome of each decision by end of challenge. A one-line plain-language takeaway summarizes each: *"You sold $AAPL on day 3. Marcus held. That single decision accounted for 3.8% of the gap."*

The autopsy is opt-in — accessed via a "See what decided this" button on the recap screen. It is never shown automatically. Users who lost are more likely to engage with it; the CTA copy reflects this: *"See where it slipped away."* For wins: *"See what worked."*

**Loss reflection prompt**

After a challenge loss, a card appears in the Home activity feed (not a modal): *"You lost this challenge by [X]%. Want to see the 3 moments that mattered most?"* with a link to the autopsy. The card appears once and dismisses permanently when tapped or swiped away.

### Agent Reactions

Hired agents react in two situations:

1. **Big trade:** User makes a trade exceeding 3% of their portfolio value. The threshold is 3% (not 5%) to ensure reactions happen regularly.
2. **Ticker overlap:** User trades a ticker the agent currently holds or recently traded — regardless of size. The agent always has something to say when you touch their position.

Response: a short in-character blurb, max one reaction per agent per day. Marcus: "Bold move on $TSLA. Let's see if you can keep up." Priya: "I wouldn't have done that, but I respect the conviction." This keeps the app feeling alive between sessions.

Stock-only agents go silent on trades during weekends when markets are closed, but send one in-character Saturday commentary — reflecting on the week or flagging what they're watching for Monday.

### Portfolio Reset

Available as a one-time IAP ($0.99). Resets the user's cash balance to $100,000. Does not wipe trade history, challenge history, or agent logs. Users who reset frequently will have a visible reset count on their public profile, preserving leaderboard integrity.

### Replay Packs

Replay Packs let users trade a historical market event with $100,000 in paper cash, using real price data from that period. Each pack is a self-contained scenario with a fixed start date, end date, and a brief setup card explaining the market context. Performance in a replay does not affect the main portfolio or leaderboard standing.

Packs at launch: COVID crash (Feb–Apr 2020), 2021 meme stock mania (Jan–Feb 2021), 2022 rate hike cycle (Jan–Dec 2022). New packs added over time, including event-driven scenarios (e.g. a single earnings week for a major stock).

Each pack costs $1.99–$2.99 as a one-time IAP. Packs are included in the premium subscription at no additional cost. Replay results are shareable — a summary card showing return over the period can be shared externally, which drives organic discovery. Agents also "play" each scenario using their rule-based logic, so users can compare their replay performance against an agent's replay performance.

### Notifications

Push notifications for: advisory mode recommendations, significant portfolio moves (5%+ in a day), position alerts (individual holding moves ±3% in a session), challenge milestones, leaderboard rank changes (when rank improves or drops by 3+ positions), agent reactions, morning agent brief (see Engagement), recommendation expirations, end-of-challenge recaps, queued order execution at market open, dividend credits, and Day 2 re-engagement message (if no challenge started).

### Engagement & Retention

**Morning agent brief**

Every weekday at 9:15am ET, each user's hired agents send a short in-character push notification previewing what they're watching at market open. This fires only if the user has at least one active hire. It is not a trade recommendation — it is ambient personality that makes agents feel alive between sessions.

Examples: Marcus: *"Volume pre-market on $NVDA. Watching the open."* Priya: *"Nothing new to do today. Patience is the position."* HODL Hannah: *"Still holding. Always holding. GM."*

Users can disable morning briefs per-agent in notification settings. Stock-only agents do not send briefs on weekends.

**Position alerts**

Users can opt in to alerts when any individual holding moves ±3% in a single session. Off by default, enabled per-ticker from the stock detail screen. These are distinct from the portfolio-level 5%+ alert.

**Personal records**

The activity feed and Portfolio screen surface notable personal milestones as they happen: best single-day return, biggest single trade gain, longest challenge win streak, first time beating a specific agent. These are facts, not badges — no XP, no gamification framing. They appear once in the feed and are accessible on the Portfolio screen under a "Your records" section.

**Challenge discovery board**

The Challenges tab includes a browsable feed of recently started public challenges — user vs agent matchups that opted into visibility. Users can tap any listed challenge to see the starting balance, duration, and current standings. This creates ambient competitive pressure and surfaces the app's activity to users without active challenges. Starting a public challenge is opt-in at challenge creation.

**Group/club challenges (V2)**

3–10 users form a group and compete as a team against another group or a designated agent. The group shares a combined portfolio, with each member contributing an equal cash stake. Group performance is tracked separately from individual portfolios. Group challenges are premium-only. This is the highest-leverage social feature for driving word-of-mouth and retention among friend groups and investment clubs.

---

## Monetization

**Free tier:** Access to all agents in advisory mode, one active challenge at a time, standard portfolio analytics (win rate, average holding period, best/worst single trade, cash drag, challenge W/L record per agent, percentile rank, all-time return vs each agent), full agent marketplace and logs, agent holdings visible with a 24-hour delay, challenge discovery board, morning agent briefs.

**Premium tier:** Autopilot mode for agents, multiple simultaneous challenges (up to 5), group/club challenges, advanced analytics (Sharpe ratio, max drawdown charts, sector exposure breakdown, beta vs S&P 500, sector concentration score, advisory recommendation acceptance rate with outcome split), early access to new agents, real-time visibility into agent holdings.

**IAP:** Portfolio reset at $0.99 per reset. Replay Packs at $1.99–$2.99 per pack (see below).

No ads. The product positioning is a serious-but-fun finance app and ads undermine that.

---

## Key Screens

**Home** — Portfolio value, active challenge standings, agent activity feed showing what your hired agents did today, leaderboard preview (top 5 users by 30-day return).

**Markets** — Stock and crypto search, watchlist, real-time prices with market status indicator (OPEN / CLOSED / PRE-MARKET / AFTER-HOURS). Earnings calendar badges on stocks reporting within 7 days. Crypto visible 24/7, stocks show after-hours data with visual indicator.

**Trade** — Buy/sell flow, market order confirmation with bid/ask spread shown, execution price disclaimer, market hours status. After-hours orders show queue warning. Order type selection (market/limit) in V2.

**Agent Marketplace** — Browsable roster filterable by strategy, risk level, and asset class. Profile card for each agent with key stats and a hire button. Slot availability shown for popular agents.

**Agent Profile** — Full track record, personality blurb, complete trade log with rationale, current holdings (premium), slot availability.

**Portfolio** — Total P&L, segment breakdown (self vs each agent), holdings list, performance chart over time, standard analytics (win rate, average holding period, best/worst single trade, cash drag), reset option.

**Challenges** — Active challenges with live standings, challenge history, W/L record per agent, start new challenge flow (vs agent or vs friend), full leaderboard (top 50, opt-in to appear) with user's current percentile rank shown.

**Trade Comparison** — Side-by-side view of user trades vs agent trades for any challenge period, with outcome annotations.

**Recap** — Post-challenge breakdown with key trades highlighted, winner announcement, agent in-character reaction.

---

## Tech Stack

**Mobile** — React Native for cross-platform. WebSocket connections for real-time price streaming.

**Market Data** — Alpaca Markets API for stocks and crypto (free tier covers both). CoinGecko as fallback for crypto price data.

**Backend** — Node.js with WebSocket server for price streaming. Cron jobs for agent rebalancing logic. Postgres for trade history and portfolio state. Redis for real-time price caching.

**Agent Logic** — Rule-based strategies in V1. Each agent is an isolated module with its own rebalancing rules running on a cron schedule. No ML required initially. Modularity means new agents are easy to add without touching existing ones.

**Auth** — Supabase Auth. Email/password, Sign in with Apple, Sign in with Google.

**Notifications** — Firebase Cloud Messaging.

---

## Onboarding

First-time users see a 3-screen welcome flow before landing on Home:

1. **Welcome** — App name, one-line value prop ("Outthink the AI. Learn why you lost."), Get Started button.
2. **How it works** — Three bullet points with icons: trade with $100k paper cash against live prices / challenge AI agents with real track records / see exactly where you diverged and what it cost you. Skip option.
3. **Notification permission** — "Marcus wants to send you trade tips." Explains advisory mode push notifications with Allow / Not Now options. This is the only place the OS permission prompt is triggered. Users who tap Not Now can enable later from Settings.

After onboarding, user lands on Home. The FTUE guide takes over from here — see First-Time User Experience below.

---

## First-Time User Experience

The FTUE runs from account creation through the first completed challenge. It replaces empty states with a directed path, introduces agents through action rather than explanation, and gets the user to their first meaningful moment (comparing their trades against an agent's) as fast as possible.

### Mission 1 Cards (Home screen)

New users see a "Your first moves" section pinned to the top of Home. It shows three sequential action cards. Each card disappears once its action is completed. The section disappears entirely once all three are done.

**Card 1: See what Marcus is trading**
CTA: "View Marcus's moves →"
Taps into Marcus's agent profile / trade log. Marked complete after 10 seconds on the page or after scrolling the log.

**Card 2: Make your first trade**
CTA: "Go to Markets →"
Marked complete after first trade executes.

**Card 3: Challenge an agent**
CTA: "Start a challenge →"
Marked complete after a challenge is created (doesn't need to resolve).

Cards are not skippable. They are not a blocking modal — the user can ignore them and use the app freely. But they persist on Home until completed. No progress percentage, no gamification framing — just three clear prompts.

### Agent Intro Message

Within 2 minutes of account creation, Marcus sends an in-app notification card (and a push notification if permission was granted):

> *"New money just hit the account. Let's see what you do with it."*

This appears as the first item in the Home activity feed. It links to Marcus's profile. If the user has not hired Marcus, a "Hire Marcus" button appears at the bottom of his profile with the message still visible.

This is the only unprompted agent message that fires outside of normal reaction triggers. It happens once per account, never again.

### Annotated First Trade

The first time a user reaches the trade confirmation screen, key fields display one-time educational labels:

- **Execution price** — *"Market orders fill at the next available ask price, which may differ slightly from the quote you saw."*
- **Bid / Ask spread** — *"The spread is the difference between what buyers will pay and what sellers will accept. You buy at the ask, sell at the bid."*

These labels are shown once and never again. They do not block or slow the flow — they appear as small inline annotations below each field, not as modals.

### Post-First-Trade Moment

After the first trade executes, a full-screen card overlays the confirmation screen:

> **"First trade in the books."**
> [Ticker] [Action] [Quantity] at [Price]
>
> *"See what Marcus would have done with [ticker]."*
> [View Marcus's [ticker] position →]

Tapping the CTA opens Marcus's trade log filtered to that ticker. Dismissing the card goes back to Markets. This moment happens once — the first trade only.

### Day 2 Re-engagement

If the user returns the next day and has not yet started a challenge, a card appears at the top of Home:

> *"Marcus is up 2.1% since you joined. Are you ahead or behind?"*
> [Start a challenge →]

This is the only FTUE message that fires on day 2. It uses Marcus's actual return since the user's account creation date.

---

## Settings Screen

Accessible from a gear icon in the top-right of the Portfolio tab.

**Account**
- Display name (editable)
- Email (read-only)
- Subscription status (Free / Premium) with upgrade CTA if free
- Reset count (e.g. "Resets used: 2")

**Privacy**
- Show on leaderboard (toggle, off by default)

**Notifications**
- Advisory recommendations (toggle)
- Agent reactions (toggle)
- Challenge milestones (toggle)
- Portfolio alerts — 5%+ moves (toggle)
- Recommendation expiry reminders (toggle)

**App**
- What's New (changelog history, current version at top)
- Rate Mockket
- Privacy Policy
- Terms of Service

**Danger Zone**
- Delete account — requires confirmation ("Type DELETE to confirm"). Deletes user account and all personal data. Trade history is anonymized, not deleted, to preserve leaderboard historical integrity.

---

## App Updates

### Force Update

On every launch, the app fetches a version config from the backend (`/config/app-version`). The config specifies the minimum supported version, the latest version, and the current update mode per platform:

```json
{
  "ios": {
    "minimumVersion": "1.2.0",
    "latestVersion": "1.5.0",
    "updateMode": "hard" | "soft" | null
  },
  "android": { ... }
}
```

If the installed version is below `minimumVersion`, the app responds based on `updateMode`:

**Hard update** — A full-screen blocking screen replaces the app. The user cannot proceed. Title: *"Update Required"*. Body: *"This version of Mockket is no longer supported. Update to keep trading."* One CTA: "Update Now" — deep links to the App Store or Play Store. No dismiss option.

**Soft update** — A non-blocking banner is pinned to the top of Home. *"A new version of Mockket is available."* with an "Update" link and an X to dismiss for the current session. Re-appears on next launch until the user updates.

If `updateMode` is null, nothing is shown regardless of version. This lets the backend silence update prompts during a staged rollout.

### What's Changed

Every time the user opens the app on a new version for the first time, a bottom sheet appears showing what changed. The last-seen version is stored on device. On launch, it is compared against the current binary version — if they differ, the app fetches the changelog for the new version from the backend and shows the sheet once. After the user dismisses, the new version is written to storage and the sheet never appears again for that version.

**Bottom sheet** — Titled *"What's New"* with the version number and release date. Entries are grouped under three labels: **New**, **Improved**, and **Fixed**. Single "Got it" CTA to dismiss.

**Settings entry** — Settings > App > What's New shows full changelog history for recent versions, with the current version at top. Accessible at any time.

**Backend model** — Changelog content is managed server-side so copy can be corrected after release without a new app version:

```
AppVersion { version, platform: "ios"|"android"|"both", releaseDate, entries[] }
ChangelogEntry { type: "new"|"improved"|"fixed", text }
```

---

## Premium

**Price:** $7.99/month or $59.99/year (~37% discount).

**What's included:**
- Autopilot mode for hired agents
- Multiple simultaneous challenges (up to 5)
- Advanced analytics: Sharpe ratio, max drawdown, sector exposure breakdown, beta vs S&P 500, sector concentration score, advisory recommendation acceptance rate with outcome split (how trades performed when you followed vs ignored each agent)
- Real-time agent holdings visibility (free tier has 24h delay)
- Early access to new agents before general availability

**Paywall trigger:** Free users encounter the upgrade prompt when they:
- Try to switch a hired agent from advisory to autopilot
- Try to start a second simultaneous challenge
- Tap on advanced analytics charts (shown blurred with lock icon)
- Tap "Real-time holdings" on an agent profile (shows blurred with lock icon)

**Paywall screen:** Full-screen modal. Lists 4 premium benefits with checkmarks. Monthly / Annual toggle with savings callout. "Start 7-day free trial" CTA. "Maybe later" dismiss link at bottom.

**Free trial:** 7 days. Requires payment method upfront. Auto-renews at selected price after trial. Users are reminded 1 day before trial ends via push notification.

---

## Agent Slot Mechanics

Agent slot limits are a **V2 feature**. In MVP (V1), all agents have unlimited slots.

In V2, popular agents have limited capacity. Each agent has a defined slot limit. When an agent is full:
- The hire button is replaced with a "Join Waitlist" button
- Users on the waitlist are notified when a slot opens (in queue order)
- Waitlist position is visible on the agent's profile

Slot limits per agent are configured server-side and can be adjusted over time. Starting limits (V2): Marcus — 500 slots, Priya — unlimited (she's boring, demand is lower).

---

## Withdrawing from an Agent

When a user withdraws from an agent hire:

1. User taps "Withdraw" on the agent segment in Portfolio view.
2. Confirmation sheet: "Withdraw from [Agent]? Their open positions will be liquidated at current market price. Cash returns to your main portfolio."
3. On confirm: all open positions in the agent's segment are market-sold immediately (during market hours) or queued for next market open (after hours). Cash is returned to the user's main portfolio balance.
4. The AgentHire record is marked `isActive: false`. The hire is gone — to re-hire, the user starts fresh from the marketplace.

**Pause** (different from withdraw): User can pause without liquidating. Agent stops making new trades. Existing positions are held. Cash allocation stays locked. User can unpause at any time to resume. Pausing does not return cash.

---

## Empty States & Error States

### Empty States

| Screen | Condition | Message |
|---|---|---|
| Home — activity feed | No agents hired yet | Mission 1 cards shown instead (see FTUE). After FTUE complete: "Hire an agent to see their moves here." |
| Home — challenges | No active challenge | "No active challenge. Start one from the Challenges tab." |
| Portfolio — holdings | No holdings, no agents | "Your portfolio is empty. Go to Markets to make your first trade." |
| Challenges — history | No completed challenges | "No challenge history yet. Start your first challenge." |
| Markets — search | No results | "No results for '[query]'. Try a different ticker or company name." |
| Agent trade log | Agent has no trades yet | "[Agent] hasn't made any trades yet. Check back after their first rebalance." |

### Error States

| Scenario | Behavior |
|---|---|
| Market data unavailable | Show last known price with a "Delayed" badge. Banner at top: "Live prices temporarily unavailable." No trading blocked — users can still submit orders. |
| WebSocket disconnected | Prices stop updating. Show "Reconnecting…" badge on price cells. Auto-reconnect silently. |
| Trade submission fails | Inline error below confirm button: "Trade failed. Please try again." Do not navigate away. |
| Agent recommendation expires mid-view | Recommendation card grays out with "Expired" badge. Approve/Reject buttons are hidden. |
| Recap not yet available | "Recap is being calculated. Check back in a few minutes." with a refresh button. |
| Network offline | Full-screen offline banner with last-sync timestamp. App remains readable (cached data). No writes allowed. |

---

## Tech Stack

Ship with Marcus and Priya only, stocks only (crypto in V2), advisory mode only (autopilot in V2), 1-week and 1-month challenges, agent challenges and friend challenges, market orders only (limit orders in V2), FTUE guide (Mission 1 cards + agent intro + annotated first trade), bid/ask spread on trade confirmation, market hours enforcement with after-hours order queuing, PDT warning, dividends, stock splits, earnings calendar, basic portfolio view, agent trade logs, leaderboard (top 50), and end-of-challenge recap. That's a complete product with the full core loop intact.

V2 adds crypto, The Degen, HODL Hannah, The Quant, Elena, autopilot mode, limit orders, the full agent marketplace with slot mechanics, the side-by-side trade comparison view, and pre-market/after-hours trading.

V2 adds crypto, The Degen, HODL Hannah, The Quant, Elena, autopilot mode, limit orders, the full agent marketplace with slot mechanics, and the side-by-side trade comparison view.

