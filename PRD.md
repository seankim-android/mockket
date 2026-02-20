# PRD: Mockket — AI Trading Agent Marketplace

## Overview

Mockket is a mobile app where users invest fake money in real markets (stocks and crypto) and compete against or hire AI trading agents. Each agent has a name, personality, strategy, and live track record built from real performance data. Users can trade manually, hire agents to manage portions of their portfolio, or do both. The core loop: outperform the market, outperform the agents, learn from the difference.

---

## Problem

Paper trading apps are boring because there's nothing at stake and nothing to compete against. Investment education apps are dry. TradeRival combines the engagement of competition with learn-by-doing paper trading, wrapped in a character-driven marketplace that makes finance feel approachable and fun.

---

## Target Users

**Primary:** Beginner to intermediate investors (18-35) who want to learn without risking real money and enjoy competitive or game-like experiences.

**Secondary:** Finance enthusiasts and experienced traders who want to test strategies or mess around with crypto without consequences.

---

## Core Concepts

**Paper Portfolio** — Every user starts with $100,000 in fake cash. They can trade US stocks and crypto with real-time prices. P&L, trade history, and performance are tracked across the lifetime of the account.

**AI Agents** — Named characters with distinct strategies, personalities, and live track records built from actual performance data over time. Users can hire agents to manage a portion of their portfolio autonomously, receive trade recommendations from them in advisory mode, or simply compete against them in challenges.

**Challenges** — Fixed-duration competitions (1 week, 1 month, 3 months) where users pit their portfolio against an agent or another user. Winner is whoever has higher returns at the end.

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

User browses the marketplace, views an agent's profile and track record, and allocates a dollar amount. The agent runs in one of two modes:

- **Advisory mode (default):** Agent sends trade recommendations via push notification. User approves or rejects each trade. Recommendations expire after 24 hours if not acted on.
- **Autopilot mode (premium):** Agent trades autonomously on its rebalancing schedule. User can override or pause at any time.

### Real-Time Trading

Live stock prices via Alpaca API during market hours. Live crypto prices 24/7 via Alpaca's crypto endpoints. WebSocket connections for real-time price updates. Agent portfolios rebalance on a schedule — every 6 hours for crypto, once daily for stocks in V1.

### Challenges

Users start a challenge against any agent or another user. Fixed durations: 1 week, 1 month, 3 months. Leaderboard updates in real time. End-of-challenge recap screen breaks down who won, what trades decided it, and the agent's in-character reaction to the outcome.

### Agent Logs & Trade Comparison

Each agent exposes a complete trade log showing every action taken: timestamp, ticker, order type, price at execution, position size, and in-character rationale. Users can pull up a side-by-side view comparing their trades to the agent's trades over any challenge period. Each trade is annotated with outcome data — how much was made or lost, and how it compared to what the other side did at the same moment. This is the core learning feature.

### Agent Reactions

After a user makes a trade, their hired agent can react with a short in-character blurb. Marcus: "Bold move on $TSLA. Let's see if you can keep up." Priya: "I wouldn't have done that, but I respect the conviction." This keeps the app feeling alive between sessions.

### Portfolio Reset

Available as a one-time IAP ($0.99). Resets the user's cash balance to $100,000. Does not wipe trade history, challenge history, or agent logs. Users who reset frequently will have a visible reset count on their public profile, preserving leaderboard integrity.

### Notifications

Push notifications for advisory mode recommendations, significant portfolio moves (5%+ in a day), challenge milestones, agent reactions, recommendation expirations, and end-of-challenge recaps.

---

## Monetization

**Free tier:** Access to all agents in advisory mode, one active challenge at a time, standard portfolio analytics, full agent marketplace and logs.

**Premium tier:** Autopilot mode for agents, multiple simultaneous challenges, advanced analytics (Sharpe ratio, drawdown charts, sector exposure breakdown), early access to new agents, real-time visibility into agent holdings (not just performance).

**IAP:** Portfolio reset at $0.99 per reset.

No ads. The product positioning is a serious-but-fun finance app and ads undermine that.

---

## Key Screens

**Home** — Portfolio value, active challenge standings, agent activity feed showing what your hired agents did today.

**Markets** — Stock and crypto search, watchlist, real-time prices with market status indicator. Crypto visible 24/7, stocks show after-hours data with visual indicator.

**Trade** — Buy/sell flow, order type selection (market/limit in V2), confirmation screen with current price.

**Agent Marketplace** — Browsable roster filterable by strategy, risk level, and asset class. Profile card for each agent with key stats and a hire button. Slot availability shown for popular agents.

**Agent Profile** — Full track record, personality blurb, complete trade log with rationale, current holdings (premium), slot availability.

**Portfolio** — Total P&L, segment breakdown (self vs each agent), holdings list, performance chart over time, reset option.

**Challenges** — Active challenges with live standings, challenge history, start new challenge flow.

**Trade Comparison** — Side-by-side view of user trades vs agent trades for any challenge period, with outcome annotations.

**Recap** — Post-challenge breakdown with key trades highlighted, winner announcement, agent in-character reaction.

---

## Tech Stack

**Mobile** — React Native for cross-platform. WebSocket connections for real-time price streaming.

**Market Data** — Alpaca Markets API for stocks and crypto (free tier covers both). CoinGecko as fallback for crypto price data.

**Backend** — Node.js with WebSocket server for price streaming. Cron jobs for agent rebalancing logic. Postgres for trade history and portfolio state. Redis for real-time price caching.

**Agent Logic** — Rule-based strategies in V1. Each agent is an isolated module with its own rebalancing rules running on a cron schedule. No ML required initially. Modularity means new agents are easy to add without touching existing ones.

**Auth** — Email/password, Sign in with Apple, Sign in with Google.

**Notifications** — Firebase Cloud Messaging.

---

## MVP Scope

Ship with Marcus and Priya only, stocks only (crypto in V2), advisory mode only (autopilot in V2), 1-month challenges only, market orders only, basic portfolio view, agent trade logs, and end-of-challenge recap. That's a complete product with the full core loop intact.

V2 adds crypto, The Degen, HODL Hannah, The Quant, Elena, autopilot mode, limit orders, the full agent marketplace with slot mechanics, and the side-by-side trade comparison view.

---

## Open Questions

- Do users compete against each other (PvP) or only against agents in V1? PvP adds retention but also matchmaking complexity.
- How transparent are agent holdings in free tier? Showing holdings in real time might undermine the challenge element.
- Should advisory recommendations include the agent's reasoning upfront, or only reveal it in the post-trade log?
- How do stock-only agents behave on weekends when markets are closed? Do they send any notifications or go fully silent?
- Does a portfolio reset affect an agent's trust score or the hire relationship, or does the agent just keep running on the new balance?
