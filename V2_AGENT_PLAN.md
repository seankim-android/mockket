# V2 Agent Features — Design Plan

This document covers the design and implementation plan for V2 agent features in Mockket. It includes the four new agents, infrastructure changes, the agent marketplace, slot mechanics, a new LLM-powered personality layer, and a chat system for friend and agent conversations.

---

## Table of Contents

1. [New Agents](#1-new-agents)
2. [LLM Personality Layer](#2-llm-personality-layer)
3. [Chat System](#3-chat-system)
4. [Infrastructure Changes](#4-infrastructure-changes)
5. [Agent Marketplace & Slot Mechanics](#5-agent-marketplace--slot-mechanics)
6. [Cron & Scheduling Changes](#6-cron--scheduling-changes)
7. [Interface & Type Changes](#7-interface--type-changes)
8. [Implementation Order](#8-implementation-order)
9. [Open Questions](#9-open-questions)

---

## 1. New Agents

### 1a. Elena "Steady" Park — Dividend Focus

**Slug:** `elena-steady-park`
**Risk:** low | **Assets:** stocks | **Schedule:** daily

**Why she's easiest to build first:** Closest to Priya's pattern. Same daily stock schedule, same low-turnover philosophy. The difference is dividend-specific logic.

**Strategy logic:**
- Watchlist: Dividend aristocrats — `['JNJ', 'KO', 'PG', 'PEP', 'MMM', 'ABT', 'XOM', 'CVX', 'T', 'VZ']`
- **Buy signal:** If cash > $1,000 and an unowned watchlist stock has dividend yield > 2.5%, buy it. Allocate evenly across up to 5 positions (max 20% of portfolio per position).
- **Sell signal:** Almost never. Only sells if a holding cuts its dividend (requires dividend data feed) or if a position exceeds 30% of portfolio (trim to 20%).
- **Rebalance behavior:** Very low activity. Most days return empty `Trade[]`. Occasionally adds to underweight positions.

**Personality:**
- Calm, methodical, slightly old-school. Talks about yield, compounding, and "letting dividends do the work."
- Rationale example: `"Added to $JNJ position. Dividend yield at 3.2%, consistent payer for 40+ years."`
- Reaction example: `"Selling $KO? That's 60 years of consecutive dividend raises you're walking away from."`
- Preview example: `"$PEP at this price gives you a 2.8% yield. I'd buy and forget about it."`

**Data needs:** Dividend yield data per ticker. Options:
- Alpaca doesn't provide dividend yield natively — use a supplementary source
- Polygon.io (already in env vars as `POLYGON_API_KEY`) provides dividend data
- Or hardcode approximate yields for the watchlist and refresh periodically
- **Recommendation:** Use Polygon's `/v3/reference/dividends` endpoint for ex-div dates and amounts, compute yield from price. Cache daily.

---

### 1b. HODL Hannah — Crypto Diamond Hands

**Slug:** `hodl-hannah`
**Risk:** medium | **Assets:** crypto | **Schedule:** never

**The unique problem:** She never rebalances, but she needs to make an initial purchase at hire time.

**Proposed flow:**
1. User hires Hannah → `POST /agent-hires` creates the hire record
2. Backend immediately calls `hodlHannah.initialBuy(portfolio, marketData)` (new method — see interface changes below)
3. She allocates 60% BTC, 40% ETH from her allocated cash
4. From that point on, `rebalance()` always returns `[]`
5. She never sells. Ever. Holdings persist until the user fires her (which liquidates positions per existing withdraw flow).

**Why not use the cron?** The cron has no "never" schedule path. Making the user wait for a cron tick that never fires is broken UX. The initial buy should be synchronous with the hire action.

**Strategy logic:**
- Watchlist: `['BTC/USD', 'ETH/USD']` (Alpaca crypto ticker format)
- `initialBuy()`: Split allocated cash 60/40 between BTC and ETH. Buy at ask price.
- `rebalance()`: Always returns `[]`.
- No sell logic. No stop-loss. No trimming. That's the whole point.

**Personality:**
- True believer energy. Unshakeable conviction. Dismissive of short-term price action.
- Rationale: `"Still holding. Always holding."`
- Reaction (user buys crypto): `"Welcome to the club. Now don't touch it."`
- Reaction (user sells crypto): `"Paper hands detected. We don't do that here."`
- Preview: `"Buy $BTC? Obviously. The question is why you haven't already."`

---

### 1c. The Quant — Technical Indicators

**Slug:** `the-quant`
**Risk:** medium | **Assets:** stocks, crypto | **Schedule:** 6h

**The hard problem:** The Quant needs historical price data to compute RSI, MACD, and moving averages. The current `MarketData` interface only has real-time snapshots.

**Proposed approach — extend MarketData:**

```typescript
export interface MarketData {
  prices: Record<string, number>
  ask: Record<string, number>
  bid: Record<string, number>
  timestamp: string

  // V2: optional historical data for agents that need it
  history?: Record<string, {
    closes: number[]      // last N daily closes (most recent last)
    volumes: number[]     // last N daily volumes
    periodMinutes: number // granularity: 1440 = daily, 360 = 6h
  }>
}
```

The cron job pre-fetches history **only for agents whose `needsHistory` flag is true** (to avoid unnecessary API calls for agents that don't use it). The Quant's module sets `needsHistory: true`.

**Data source:** Alpaca's `/v2/stocks/{ticker}/bars` endpoint provides historical OHLCV data. Request 50 daily bars to compute:
- **RSI(14):** 14-period relative strength index
- **MACD(12,26,9):** standard MACD with signal line
- **SMA(20) / SMA(50):** moving average crossovers

**Strategy logic:**
- Watchlist: `['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'BTC/USD', 'ETH/USD']`
- **Buy signal:** RSI < 30 (oversold) AND MACD histogram turning positive AND price above SMA(50). Allocate 5% of portfolio per position.
- **Sell signal:** RSI > 70 (overbought) OR MACD histogram turning negative while price below SMA(20). Sell entire position.
- **Position limit:** Max 8 concurrent positions.

**Personality:**
- No personality. Pure math. Clinical. Refers to signals by name. No emotion.
- Rationale: `"RSI crossed 30, mean reversion signal triggered. MACD histogram inflecting positive. 5% position opened on $NVDA."`
- Reaction: `"Your trade on $AAPL has no statistical edge at current RSI levels. Noted."`
- Preview: `"$MSFT RSI at 45, neutral zone. No signal. I'd wait."`

**Indicator computation:**
- Build a `packages/shared/src/indicators.ts` module with pure functions: `computeRSI(closes, period)`, `computeMACD(closes, fast, slow, signal)`, `computeSMA(closes, period)`
- These are deterministic, no external deps — keeps agent logic pure and testable
- The Quant's `rebalance()` calls these functions on the `history` data

---

### 1d. The Degen — Memecoins & Altcoins

**Slug:** `the-degen`
**Risk:** degen | **Assets:** crypto | **Schedule:** 6h

**The data source problem:** Alpaca supports major crypto (BTC, ETH, SOL, DOGE, etc.) but not every small-cap altcoin/memecoin. Two options:

**Option A: Stay within Alpaca's crypto universe**
- Alpaca supports ~30 crypto pairs including: DOGE, SHIB, AVAX, SOL, MATIC, LINK, UNI, AAVE, etc.
- Plenty of volatile tokens to work with for a "degen" personality
- Simpler: no second price provider, same trade execution pipeline

**Option B: Add CoinGecko for price discovery, execute on Alpaca where available**
- CoinGecko for watchlist/discovery of trending tokens
- Only trade tokens that Alpaca actually supports
- More "authentic" degen experience but added complexity

**Recommendation: Option A for V2 launch.** Stay within Alpaca's crypto universe. The personality and volatility of DOGE/SHIB/SOL is "degen" enough. CoinGecko integration can come later if users want more obscure tokens.

**Strategy logic:**
- Watchlist: `['DOGE/USD', 'SHIB/USD', 'SOL/USD', 'AVAX/USD', 'MATIC/USD', 'LINK/USD', 'UNI/USD', 'AAVE/USD']`
- **Buy signal:** Buy the token with the highest 24h price change (momentum chasing). Allocate up to 25% of portfolio in a single position. No diversification discipline.
- **Sell signal:** Sell if a position drops >15% from entry (wider stop-loss than Marcus's 5% — degens hold longer). Also sells if position is up >50% (take profit on moon shots).
- **Position limit:** Max 4 positions. Concentrated bets.
- **High turnover:** Expected to trade at most rebalance cycles.

**Guardrails (server-side, not in agent logic):**
- If The Degen's allocated portfolio drops below 20% of initial allocation, auto-pause and notify user: "The Degen got rekt. Re-confirm to keep going?"
- This prevents silent total loss without user awareness

**Personality:**
- Unhinged. Meme-speak. Rocket emojis in spirit (though output is text). Zero pretense of sophistication.
- Rationale: `"Aping in. No further comment."`
- Rationale (sell at loss): `"Got rekt on $DOGE. Pain. Moving on to the next one."`
- Rationale (sell at profit): `"$SOL to the moon and back. Took profits. You're welcome."`
- Reaction (user buys crypto): `"One of us. One of us."`
- Reaction (user buys stocks): `"Stocks? In this economy? Bold."`
- Preview: `"$SHIB? Absolutely send it. This is the way."`

---

## 2. LLM Personality Layer

### The Idea

Currently all agent text (rationales, reactions, previews, morning briefs) are template strings with variable interpolation. They're consistent but repetitive — users will see the same phrases after a few days.

An LLM layer generates dynamic, in-character text while the **trading decisions remain rule-based**. The LLM never decides what to buy or sell — it only describes decisions that the rules already made.

### Architecture

```
Rule-based rebalance() → Trade decisions (what to buy/sell)
                              ↓
                        LLM personality layer → In-character text (why, in their voice)
```

**The LLM touches:**
- `getRationale(trade)` — dynamic post-trade explanation
- `react(userTrade)` — dynamic reaction to user's move
- `preview(proposed)` — dynamic pre-trade commentary
- Morning briefs — dynamic market-open personality messages
- Post-challenge reactions — dynamic win/loss commentary

**The LLM does NOT touch:**
- `rebalance()` — pure rule-based, deterministic
- Trade execution — prices, quantities, timing
- Any financial decision-making

### Implementation Options

**Option A: Claude API with system prompts per agent**

Each agent has a system prompt defining its personality, voice, and constraints. The LLM call happens in the personality methods, with the trade context passed as user message.

```typescript
// packages/agents/src/lib/personality.ts
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function generatePersonalityText(
  agentSystemPrompt: string,
  context: string,
  maxTokens: number = 100
): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    system: agentSystemPrompt,
    messages: [{ role: 'user', content: context }],
  })
  return response.content[0].type === 'text' ? response.content[0].text : ''
}
```

Each agent defines its personality prompt:

```typescript
// marcus-bull-chen/personality.ts
export const SYSTEM_PROMPT = `You are Marcus "The Bull" Chen, an aggressive momentum trader.
Voice: Confident, bro-ish, competitive. Short punchy sentences. Uses trading slang.
You never hedge or sound uncertain. Every trade is conviction.
Keep responses to 1-2 sentences max. Never use emojis.
Never give financial advice disclaimers — this is a paper trading game.`
```

**Option B: Pre-generated text bank refreshed periodically**

Use Claude API in a batch job to pre-generate a large bank of rationale/reaction templates per agent. Store in DB or JSON. The agent methods pick from the bank at runtime, interpolating trade-specific variables.

- **Pro:** No real-time LLM calls. Zero latency. No API cost per user action.
- **Con:** Less dynamic. Responses still feel somewhat templated, just a bigger template set. Doesn't incorporate trade-specific context (e.g., current market conditions).

**Option C: Hybrid — rule-based fallback + async LLM enhancement**

1. `getRationale()` / `react()` / `preview()` return a rule-based template immediately (current behavior)
2. An async background job calls the LLM to generate a richer version
3. The richer version replaces the template in the DB within seconds
4. Client polls or receives push update with the enhanced text

- **Pro:** No latency on the critical path. LLM failure degrades gracefully to templates.
- **Con:** More complex. Race condition between user viewing and LLM completing.

### Recommendation

**Option A for `react()` and `preview()` (user-facing, real-time).** These are triggered by user action and displayed immediately. The LLM call adds ~1-2s latency which is acceptable for a "thinking" animation UX. Use `claude-haiku` for speed.

**Option C for `getRationale()` and morning briefs.** Rationales are generated at trade execution time (cron job), not at user-view time. The async enhancement can complete before the user ever sees it. Morning briefs fire 15min before market open — plenty of time for async generation.

**Always have template fallback.** If the LLM call fails or times out (>3s), fall back to the existing template string. Never block a trade or notification on LLM availability.

### Agent System Prompts

Each agent needs a personality definition for the LLM:

| Agent | Voice | Constraints |
|---|---|---|
| Marcus | Confident, competitive, bro-ish. Trading slang. Short sentences. | Never uncertain. Every trade is conviction. |
| Priya | Calm, patient, slightly professorial. Buffett quotes. | Never impulsive. Always references fundamentals. |
| Elena | Warm, methodical, reassuring. Talks about compounding. | Never rushed. Emphasizes stability and income. |
| Hannah | True believer. Crypto maximalist. Dismissive of selling. | Never acknowledges bear cases. Diamond hands always. |
| The Quant | Clinical, emotionless, data-driven. Cites specific numbers. | Never uses subjective language. Only statistical observations. |
| The Degen | Chaotic, meme-fluent, self-aware about risk. | Never pretends to be sophisticated. Embraces volatility. |

### Context Passed to LLM

For each personality method, the LLM receives structured context:

```typescript
// getRationale
`Trade executed: ${action} ${quantity} shares of ${ticker} at $${price}.
Portfolio allocation: ${allocationPct}% of total portfolio.
P&L on this position: ${pnlPct}%.
Generate an in-character rationale for this trade.`

// react
`The user just ${action === 'buy' ? 'bought' : 'sold'} ${quantity} shares of ${ticker}.
This represents ${portfolioPct}% of their portfolio.
You ${holdsThisTicker ? 'also hold' : 'do not hold'} this ticker.
React in character. 1-2 sentences max.`

// preview
`The user is considering ${action}ing ${quantity} shares of ${ticker}.
This would be ${allocationPct}% of their portfolio.
Give your in-character opinion. 1-2 sentences max.`
```

### Cost Estimate

- Claude Haiku: ~$0.25/M input tokens, ~$1.25/M output tokens
- Average personality call: ~200 input tokens, ~50 output tokens
- Per call cost: ~$0.00005 input + ~$0.0000625 output ≈ $0.0001
- Per active user per day (est. 5 personality calls): ~$0.0005/day
- 10,000 DAU: ~$5/day, ~$150/month

Very manageable. Haiku keeps this cheap even at scale.

---

## 3. Chat System

### Overview

Two chat modes in a unified interface:
1. **Friend chat** — real-time messaging between users
2. **Agent chat** — LLM-powered conversations with hired agents

Both live in the same chat UI. A user's chat list shows conversations with friends AND hired agents side by side. The key difference: friend messages are relayed peer-to-peer, agent messages are generated by the LLM.

### 3a. Friend Chat (User-to-User)

**Core features:**
- 1:1 direct messages between users who are connected (friends, challenge opponents, or via username search)
- Real-time delivery via the existing WebSocket infrastructure
- Message persistence in Postgres
- Unread count badges
- Push notifications for new messages (when app is backgrounded)

**Data model:**

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('friend', 'agent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  user_id UUID NOT NULL REFERENCES users(id),
  -- For agent conversations, agent_id is set instead of a second user
  agent_id TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  sender_user_id UUID REFERENCES users(id),  -- NULL for agent messages
  sender_agent_id TEXT,                       -- NULL for user messages
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);
```

**WebSocket integration:**

The app already has a WebSocket connection for price feeds. Extend it to carry chat messages:

```typescript
// New WS message types
type WSMessage =
  | { type: 'price_update'; data: PriceUpdate }
  | { type: 'chat_message'; data: ChatMessage }
  | { type: 'chat_typing'; data: { conversationId: string; userId: string } }
  | { type: 'chat_read'; data: { conversationId: string; userId: string; timestamp: string } }
```

When a user sends a message, the backend:
1. Persists to `messages` table
2. Updates `conversations.updated_at`
3. Publishes to Redis channel `chat:{recipientUserId}`
4. WS server routes to recipient's connection if online
5. If recipient offline, sends FCM push notification

**API endpoints:**

```
GET    /conversations                        -- list user's conversations (paginated, sorted by updated_at)
POST   /conversations                        -- create new conversation (friend or agent)
GET    /conversations/:id/messages           -- message history (paginated, cursor-based)
POST   /conversations/:id/messages           -- send message
PATCH  /conversations/:id/read               -- mark conversation as read
```

**Contextual chat starters:**

Users can share trades and portfolio snapshots in chat:
- "Share trade" button on trade confirmation → sends a formatted trade card to a conversation
- "Share portfolio" on portfolio screen → sends a snapshot card
- Challenge results automatically post a summary card to the conversation with the opponent

```typescript
// Message content can be plain text or structured
interface ChatMessage {
  id: string
  conversationId: string
  senderUserId: string | null
  senderAgentId: string | null
  content: string
  // Structured attachments (optional)
  attachment?: {
    type: 'trade' | 'portfolio_snapshot' | 'challenge_result'
    data: Record<string, any>
  }
  createdAt: string
}
```

### 3b. Agent Chat (User-to-Agent, LLM-Powered)

**How it works:**

Users can chat with any agent they've hired. The agent responds in character using the Claude API, with context about the user's portfolio, the agent's strategy, and recent market activity.

**This is the killer LLM use case.** Unlike `react()` and `preview()` (which are triggered by specific events), agent chat is freeform. Users can ask:
- "What do you think about NVDA right now?"
- "Why did you sell my TSLA position?"
- "Should I start a challenge this week?"
- "What's your take on the Fed meeting tomorrow?"

**Agent chat system prompt structure:**

```typescript
const agentChatSystemPrompt = `
You are ${agent.name}, a trading agent in the Mockket paper trading app.

## Your personality
${agent.personalityPrompt}

## Your strategy
${agent.strategy}

## Current context
- User's portfolio: $${portfolioCash} cash, ${holdingsCount} positions
- Your allocated amount: $${allocatedCash}
- Your current holdings: ${agentHoldings}
- Your recent trades: ${recentTrades}
- Market status: ${marketStatus}

## Rules
- Stay in character at all times
- Never give real financial advice — this is a paper trading game
- You can reference the user's portfolio and your own trades
- Keep responses conversational, 1-4 sentences
- You can suggest trades but frame them as your strategy, not advice
- Never reveal exact algorithm rules (e.g. "I sell at -5%") — speak in character instead
- If asked about other agents, stay in character (e.g. Marcus might trash-talk Priya's boring strategy)
`
```

**Context window management:**

Agent chat needs recent conversation history for continuity, but we can't send the entire chat history to the LLM each time.

Strategy:
- Include the **last 20 messages** as conversation history
- Include a **context summary** block with portfolio/market state (refreshed each call)
- Use `claude-haiku` for most responses (fast, cheap)
- Upgrade to `claude-sonnet` for longer analytical responses (when user asks "why" questions about specific trades)

**Model selection heuristic:**
```typescript
function selectModel(userMessage: string): string {
  const analyticalKeywords = ['why', 'explain', 'analyze', 'compare', 'strategy', 'think about']
  const isAnalytical = analyticalKeywords.some(kw => userMessage.toLowerCase().includes(kw))
  return isAnalytical ? 'claude-sonnet-4-20250514' : 'claude-haiku-4-20250514'
}
```

**Rate limiting:**
- Free tier: 20 agent chat messages per day across all agents
- Premium: 100 messages per day
- Per-agent cooldown: max 1 message per 5 seconds (prevents spam)
- Display remaining message count in chat UI

**Agent-initiated messages:**

Agents can also initiate chat messages (not just respond):
- Post-trade notification: "Just bought $NVDA for you. Here's why..."
- Existing reactions and morning briefs now appear IN the chat thread instead of as standalone push notifications
- This unifies all agent communication into the chat interface

**Agent cross-talk (stretch goal):**

If a user has multiple agents hired, agents could occasionally reference or "react to" each other's trades in chat:
- Marcus: "I see Priya sold $AAPL. Boring move. I would've held."
- The Quant: "Marcus's NVDA position has no statistical edge at current RSI. Noted."

This would work by injecting other agents' recent activity into each agent's context window. Not required for V2 launch but architecturally possible.

### 3c. Chat UI (Mobile)

**New screens:**

1. **Chat List** (`/app/chat/index.tsx`)
   - Tab on main navigation (alongside Home, Portfolio, Challenges)
   - Shows all conversations sorted by most recent message
   - Friend conversations show user avatar + name + last message preview
   - Agent conversations show agent avatar + name + last message preview
   - Unread badge count per conversation
   - Search bar to find existing conversations or start new ones

2. **Chat Thread** (`/app/chat/[id].tsx`)
   - Standard messaging UI: messages in chronological bubbles
   - User messages on right, friend/agent messages on left
   - Agent messages have a subtle indicator (agent avatar, different bubble color)
   - For agent chats: typing indicator while LLM generates response
   - Trade/portfolio cards render inline as rich message attachments
   - "Ask [Agent]" quick-action buttons for common questions:
     - "What would you do right now?"
     - "How's my portfolio looking?"
     - "Any trades today?"

3. **New Conversation** (`/app/chat/new.tsx`)
   - Search users by username
   - Quick-access list of hired agents
   - Deep-link from agent profile: "Chat with [Agent]" button

**Navigation integration:**
- Agent reactions that currently appear as toast notifications → now post to the agent's chat thread
- Morning briefs → post to agent chat thread
- Advisory recommendations → appear as a rich card in agent chat with Approve/Reject buttons inline
- Challenge invite → appears as a rich card in friend chat with Accept button

This means the chat becomes the **primary communication surface** for both social and agent interactions, replacing scattered push notifications and standalone screens.

### 3d. Chat Cost Estimate

Agent chat LLM costs (on top of personality layer costs):

- Average agent chat message: ~500 input tokens (system prompt + context + history), ~100 output tokens
- Per message cost (Haiku): ~$0.000125 input + ~$0.000125 output ≈ $0.00025
- Per active user per day (est. 10 agent messages): ~$0.0025/day
- 10,000 DAU: ~$25/day, ~$750/month

Combined with personality layer (~$150/month), total LLM cost at 10K DAU: ~$900/month. Manageable, especially since premium users generate most agent chat traffic and they're paying subscribers.

---

## 4. Infrastructure Changes

### 3a. Historical Price Data Service

**New file:** `packages/api/src/lib/historical-prices.ts`

```typescript
interface HistoricalBar {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// Fetch N daily bars for a ticker from Alpaca
async function getDailyBars(ticker: string, limit: number): Promise<HistoricalBar[]>

// Fetch 6h bars for crypto tickers
async function getCryptoBars(ticker: string, limit: number): Promise<HistoricalBar[]>
```

**Caching strategy:**
- Cache daily bars in Redis with key `bars:daily:{ticker}` and 1-hour TTL
- Cache 6h bars with key `bars:6h:{ticker}` and 30-minute TTL
- Historical data doesn't change frequently — aggressive caching is safe

### 3b. Technical Indicator Library

**New file:** `packages/shared/src/indicators.ts`

Pure functions, no dependencies:

```typescript
function computeRSI(closes: number[], period: number): number
function computeMACD(closes: number[], fast: number, slow: number, signal: number): { macd: number; signal: number; histogram: number }
function computeSMA(closes: number[], period: number): number
function computeEMA(closes: number[], period: number): number
```

Unit-testable with known inputs/outputs. No external calls.

### 3c. Dividend Data Service

**New file:** `packages/api/src/lib/dividends.ts`

Using Polygon API (`POLYGON_API_KEY` already in env vars):

```typescript
interface DividendInfo {
  ticker: string
  yield: number          // annual yield as decimal (0.032 = 3.2%)
  exDividendDate: string
  paymentDate: string
  amount: number         // per-share dividend amount
  frequency: number      // payments per year (4 = quarterly)
}

async function getDividendInfo(ticker: string): Promise<DividendInfo | null>
async function getDividendYields(tickers: string[]): Promise<Record<string, number>>
```

Cache dividend data for 24 hours — it changes infrequently.

### 3d. LLM Client

**New file:** `packages/agents/src/lib/personality.ts`

Thin wrapper around Claude API for personality text generation. See section 2 for details.

**New env var:** Uses existing Claude API patterns. Add `ANTHROPIC_API_KEY` to env requirements.

---

## 5. Agent Marketplace & Slot Mechanics

### 4a. Slot Limits

**New DB table: `agent_slots`**

```sql
CREATE TABLE agent_slots (
  agent_id TEXT PRIMARY KEY,
  max_slots INTEGER NOT NULL DEFAULT -1,  -- -1 = unlimited
  current_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Slot tracking:**
- `current_count` incremented on hire, decremented on fire (withdraw)
- Pause does NOT free a slot (user still "has" the agent)
- Use a DB transaction with row lock (`SELECT ... FOR UPDATE`) to prevent race conditions on popular agents
- If `current_count >= max_slots` (and max_slots != -1), return 409 Conflict on hire attempt

**Initial slot limits:**

| Agent | Slots |
|---|---|
| marcus-bull-chen | 500 |
| priya-sharma | Unlimited |
| elena-steady-park | Unlimited |
| hodl-hannah | 1000 |
| the-quant | 300 |
| the-degen | 200 |

The Degen has the fewest slots — scarcity drives demand for the most chaotic agent.

### 4b. Waitlist

**New DB table: `agent_waitlist`**

```sql
CREATE TABLE agent_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  agent_id TEXT NOT NULL,
  position INTEGER NOT NULL,  -- queue position, 1-indexed
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified_at TIMESTAMPTZ,
  UNIQUE(user_id, agent_id)
);
```

**Flow:**
1. User tries to hire full agent → sees "Join Waitlist" button
2. `POST /agent-waitlist/:agentId` — adds user to queue
3. When a slot opens (user fires agent) → decrement `current_count`
4. Cron job checks waitlist, sends push to next-in-line: "A slot opened for [Agent]! Hire now before it fills."
5. Notified user has 1 hour to act, then slot passes to next person

### 4c. Marketplace API

**New endpoints:**

```
GET /agents                    -- list all agents (already exists, extend with slot data)
GET /agents/:id                -- agent profile with track record
GET /agents/:id/track-record   -- aggregated performance across all users
GET /agents/:id/trades         -- recent public trades (anonymized)
```

**Track record aggregation:**
- Compute average % return across all active hires for last 7d, 30d, 90d
- Store as materialized view or compute nightly in a cron job
- Show win/loss count for completed challenges

**Filtering:**
- `GET /agents?risk=high&assets=crypto&sort=return_30d`
- Filter by: riskLevel, assetClasses, rebalanceInterval
- Sort by: return_30d, return_7d, popularity (hire count), name

---

## 6. Cron & Scheduling Changes

### Current State

```
9:35 AM ET weekdays  → run all stock agents
Every 6h 24/7        → run all crypto agents
```

### V2 Changes

**Problem: The Quant trades stocks AND crypto on a 6h schedule.**

The current architecture splits by asset class: stock agents run daily, crypto agents run every 6h. But The Quant's `rebalanceInterval` is `6h` for both.

**Resolution options:**

**Option A: Respect agent's rebalanceInterval, not asset class**
- 6h agents run every 6h for ALL their assets (stocks included)
- Stock trades outside market hours get queued for next open (existing queuing logic)
- Simple, consistent, and The Quant's signals are time-sensitive

**Option B: Split by asset class within agent**
- The Quant runs 6h for crypto, daily for stocks
- Requires passing an `assetFilter` to `rebalance()` so the agent knows which assets to consider
- More complex, arguably more "correct"

**Recommendation: Option A.** Run The Quant every 6h for everything. If stock market is closed, the cron just queues any stock trades. The queuing system already exists. This keeps agent logic simple — `rebalance()` doesn't need to know about market hours.

**Updated cron schedule:**

```typescript
// Daily at 9:35 AM ET — agents with 'daily' interval
cron.schedule('35 9 * * 1-5', async () => {
  const dailyAgents = AGENTS.filter(a => a.rebalanceInterval === 'daily')
  await Promise.allSettled(dailyAgents.map(a => runAgentRebalance(a.id)))
}, { timezone: 'America/New_York' })

// Every 6 hours — agents with '6h' interval
cron.schedule('0 */6 * * *', async () => {
  const sixHourAgents = AGENTS.filter(a => a.rebalanceInterval === '6h')
  await Promise.allSettled(sixHourAgents.map(a => runAgentRebalance(a.id)))
})

// 'never' agents: no cron. Initial buy handled at hire time.
```

**HODL Hannah special case:** Her initial buy is triggered by the hire endpoint, not the cron. The cron never calls her since `rebalanceInterval === 'never'`.

---

## 7. Interface & Type Changes

### Extended AgentModule

```typescript
export interface AgentModule extends AgentMeta {
  watchlist: string[]

  // Existing
  rebalance(portfolio: Portfolio, marketData: MarketData): Promise<Trade[]>
  getRationale(trade: Trade): string
  react(userTrade: Trade): string
  preview(proposed: ProposedTrade): string

  // V2 additions
  needsHistory?: boolean              // if true, cron pre-fetches historical bars
  initialBuy?(portfolio: Portfolio, marketData: MarketData): Promise<Trade[]>  // for 'never' agents
}
```

### Extended MarketData

```typescript
export interface MarketData {
  prices: Record<string, number>
  ask: Record<string, number>
  bid: Record<string, number>
  timestamp: string

  // V2: optional, only populated when agent.needsHistory is true
  history?: Record<string, {
    closes: number[]
    volumes: number[]
    periodMinutes: number
  }>
}
```

### New: AgentSlot type

```typescript
export interface AgentSlot {
  agentId: string
  maxSlots: number       // -1 = unlimited
  currentCount: number
  available: boolean     // computed: maxSlots === -1 || currentCount < maxSlots
}
```

---

## 8. Implementation Order

### Phase 1: Foundation (no user-facing changes)

1. **Technical indicator library** (`packages/shared/src/indicators.ts`)
   - Pure functions: RSI, MACD, SMA, EMA
   - Unit tests with known reference values
   - No external dependencies

2. **Historical price service** (`packages/api/src/lib/historical-prices.ts`)
   - Alpaca bar fetching + Redis caching
   - Support daily and 6h bar granularity

3. **Dividend data service** (`packages/api/src/lib/dividends.ts`)
   - Polygon API integration for dividend yields
   - Daily cache refresh

4. **Extend MarketData interface** with optional `history` field
   - Backwards-compatible: existing agents ignore the new field

5. **Extend AgentModule interface** with `needsHistory` and `initialBuy`
   - Optional fields, existing agents unaffected

### Phase 2: New Agents

6. **Elena Steady Park** — simplest new agent, validates the dividend data pipeline
7. **HODL Hannah** — tests the `initialBuy` flow and 'never' schedule
8. **The Degen** — tests 6h crypto schedule and degen-level volatility handling
9. **The Quant** — most complex, depends on indicator library and history data

Each agent: implement module → register in cron → add to `/agents` endpoint → write tests.

### Phase 3: LLM Personality Layer

10. **Personality service** (`packages/agents/src/lib/personality.ts`)
    - Claude API client with system prompt injection
    - Template fallback on LLM failure
    - Rate limiting and cost tracking

11. **Integrate with agent methods**
    - Wire `getRationale()`, `react()`, `preview()` through LLM for each agent
    - A/B test: return template vs LLM text, compare engagement

12. **Dynamic morning briefs**
    - LLM-generated market commentary in agent voice
    - Incorporate actual pre-market data (futures, overnight moves)

### Phase 4: Chat System

13. **Chat data model** — `conversations`, `conversation_participants`, `messages` tables + migrations
14. **Chat API endpoints** — CRUD for conversations and messages
15. **WebSocket chat transport** — extend existing WS connection with chat message types, Redis pub/sub for chat channels
16. **Agent chat LLM integration** — system prompt per agent with portfolio context, conversation history windowing, model selection heuristic
17. **Chat UI — Chat list screen** (`/app/chat/index.tsx`) — conversation list with unread badges, search
18. **Chat UI — Chat thread screen** (`/app/chat/[id].tsx`) — message bubbles, typing indicator, rich cards for trades/portfolio/challenges
19. **Agent-initiated messages** — migrate existing reactions and morning briefs into chat threads
20. **Chat rate limiting** — free tier 20 msgs/day, premium 100 msgs/day, per-agent cooldown

### Phase 5: Marketplace & Slots

21. **Agent slots DB table + hire endpoint changes**
22. **Waitlist DB table + cron job for slot notifications**
23. **Marketplace API endpoints** (list, filter, track record)
24. **Marketplace UI** (mobile screens — browse, filter, agent profile)

### Phase 6: Polish

25. **Auto-pause guardrail for The Degen** (20% loss threshold)
26. **Track record materialized view** (nightly aggregation)
27. **Agent personality tuning** (iterate on system prompts based on user feedback)
28. **Agent cross-talk in chat** (stretch — agents reference each other's trades)

---

## 9. Open Questions

### Decided (with rationale)

| Question | Decision | Rationale |
|---|---|---|
| HODL Hannah initial buy: hire-time or cron? | Hire-time | "Never" cron interval means no cron fires. User expects action at hire. |
| The Quant schedule: unified 6h or split by asset? | Unified 6h | Simpler. Stock trades outside hours already queue. |
| The Degen data source: CoinGecko or Alpaca-only? | Alpaca-only for V2 | Simpler pipeline. DOGE/SHIB/SOL are degen enough. |
| LLM for trade decisions? | No. Rule-based only. | Determinism matters for trust. LLM only generates text. |

### Still Open

1. **Dividend cut detection for Elena:** How do we detect when a company cuts its dividend? Polygon data shows historical dividends — we could compare current vs previous quarter. But this is edge-case logic. Worth building for V2 or defer?

2. **The Quant's indicator sensitivity:** RSI < 30 and RSI > 70 are textbook thresholds. Should we use tighter bands (35/65) for more activity, or keep classic thresholds and accept low trade frequency?

3. **LLM model choice:** Haiku for all personality calls (cheap, fast) vs Sonnet for longer-form content like post-challenge reactions (better quality)? Or Haiku everywhere and upgrade selectively?

4. **Slot limits tuning:** The initial numbers (500 Marcus, 300 Quant, 200 Degen) are guesses. Should we start higher and tighten, or start tight and loosen? Tight start creates urgency but risks user frustration.

5. **Agent personality drift:** Over time, do LLM-generated responses maintain consistent personality, or do we need a "style bank" of reference responses to keep the LLM grounded? Consider including 5-10 example responses in each agent's system prompt as few-shot examples.

6. **Chat as primary surface vs. supplementary:** Should chat fully replace the standalone recommendation approval screen and reaction toasts? Or should those screens remain and chat be an additional surface? Full replacement is cleaner but a bigger migration. Keeping both means two places for the same information.

7. **Agent chat — portfolio context freshness:** The LLM system prompt includes portfolio state. How often do we refresh it? On every message (accurate but slow — requires DB queries)? Or cache the context for 5 minutes? Stale context could lead to the agent saying "you hold NVDA" when the user just sold it.

8. **Friend chat moderation:** Do we need content moderation for user-to-user chat? If so, what approach — pre-send filtering, post-send flagging, or report-based? This affects latency and complexity.

9. **Agent memory across conversations:** Should agents "remember" previous conversations with a user? e.g., "Last week you asked about TSLA and I told you to wait." This requires conversation summarization and long-term memory storage. Likely a V3 feature but worth considering in the data model.

10. **Group chat for group challenges:** The PRD mentions group/club challenges (3-10 users). Should group challenges get a group chat? This adds group messaging complexity (fan-out to N users, read receipts per participant). Worth scoping for V2 or deferring to when group challenges ship.
