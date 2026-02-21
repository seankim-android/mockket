# LAUNCH.md — Pre-Launch Checklist

Work through each section in order. Later sections depend on earlier ones.

---

## 1. Supabase

The database and auth both run on Supabase.

- [ ] Create a Supabase project at supabase.com
- [ ] Enable **Apple** OAuth provider: Authentication → Providers → Apple
- [ ] Enable **Google** OAuth provider: Authentication → Providers → Google
- [ ] Add your backend domain to **Allowed Redirect URLs**: Authentication → URL Configuration
- [ ] Collect credentials:
  - `SUPABASE_URL` — Project Settings → API → Project URL
  - `SUPABASE_SERVICE_ROLE_KEY` — Project Settings → API → service_role key (keep secret)
  - `SUPABASE_JWT_SECRET` — Project Settings → API → JWT Secret
  - `DATABASE_URL` — Project Settings → Database → Connection string → URI (use **Transaction** mode for pooled connection)

---

## 2. Firebase

Used for push notifications (FCM HTTP v1 API).

- [ ] Create a Firebase project at console.firebase.google.com
- [ ] Add your **iOS app** and **Android app** to the Firebase project (needed for device registration)
- [ ] Enable **Cloud Messaging**: Project Settings → Cloud Messaging → enable
- [ ] Generate a service account key: Project Settings → Service accounts → Generate new private key
- [ ] Flatten the downloaded JSON to a single line (remove all newlines) — this is `FIREBASE_SERVICE_ACCOUNT`
- [ ] Collect credentials:
  - `FIREBASE_PROJECT_ID` — shown in Project Settings → General
  - `FIREBASE_SERVICE_ACCOUNT` — the single-line JSON from above

---

## 3. RevenueCat + IAP

Used for the $0.99 portfolio reset consumable.

- [ ] Create a RevenueCat project at app.revenuecat.com
- [ ] Link your **App Store Connect** app and **Google Play** app in RevenueCat
- [ ] In **App Store Connect**: create a consumable IAP product with ID `mockket_reset`, price $0.99
- [ ] In **Google Play Console**: create a one-time product with ID `mockket_reset`, price $0.99
- [ ] In RevenueCat: add `mockket_reset` as a product (Products tab) — no entitlement needed for a consumable
- [ ] In RevenueCat: add a webhook pointing to `https://your-backend-url/webhooks/revenuecat` (Project Settings → Integrations → Webhooks)
- [ ] Collect credentials:
  - `REVENUECAT_SECRET_KEY` — RevenueCat dashboard → Project Settings → API keys → Secret key

---

## 4. Alpaca

Used as a read-only real-time price feed (no trades go to Alpaca).

- [ ] Sign up at alpaca.markets and generate **paper trading** API keys
- [ ] Collect credentials:
  - `ALPACA_API_KEY`
  - `ALPACA_API_SECRET`
  - `ALPACA_BASE_URL=https://paper-api.alpaca.markets`
- [ ] Verify the key has access to quotes and WebSocket data streaming

---

## 5. Redis

Used for pub/sub fan-out of live prices to WebSocket clients and for session caching. [Upstash](https://upstash.com) is recommended (free tier, serverless, no idle cost).

- [ ] Create a Redis database at upstash.com (or use any Redis provider)
- [ ] Collect credentials:
  - `REDIS_URL` — the full connection string (e.g. `redis://default:password@host:port`)

---

## 6. Polygon.io (Optional)

Used for dividend events, earnings calendar, and stock split data. The app works without it — these features silently skip.

- [ ] Sign up at polygon.io (free tier is sufficient for nightly batch fetches)
- [ ] Collect credentials:
  - `POLYGON_API_KEY`

---

## 7. Environment Variables

Set all of the following in your production backend environment. You should have all values from sections 1–6.

| Variable | Required | Source |
|---|---|---|
| `DATABASE_URL` | Yes | Supabase → Project Settings → Database |
| `SUPABASE_URL` | Yes | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase → Project Settings → API |
| `SUPABASE_JWT_SECRET` | Yes | Supabase → Project Settings → API |
| `REDIS_URL` | Yes | Upstash or Redis provider |
| `FIREBASE_PROJECT_ID` | Yes | Firebase → Project Settings |
| `FIREBASE_SERVICE_ACCOUNT` | Yes | Firebase service account JSON (single line) |
| `REVENUECAT_SECRET_KEY` | Yes | RevenueCat → Project Settings → API keys |
| `ALPACA_API_KEY` | Yes | Alpaca dashboard |
| `ALPACA_API_SECRET` | Yes | Alpaca dashboard |
| `ALPACA_BASE_URL` | Yes | `https://paper-api.alpaca.markets` |
| `APPLE_CLIENT_ID` | Yes | Apple Developer → Identifiers → Services ID |
| `CORS_ORIGIN` | No | Your mobile app's origin, or leave unset to allow all |
| `POLYGON_API_KEY` | No | Polygon.io dashboard |
| `PORT` | No | Defaults to `3000` |

---

## 8. Database Migrations

Run these against your Supabase Postgres database **after** `DATABASE_URL` is set.

**Option A — Supabase SQL Editor (easiest):**
Open Supabase dashboard → SQL Editor → New query. Paste and run each file below in order.

**Option B — psql:**
```bash
psql $DATABASE_URL -f packages/api/src/db/migrations/008_current_prices.sql
psql $DATABASE_URL -f packages/api/src/db/migrations/009_scheduled_jobs.sql
psql $DATABASE_URL -f packages/api/src/db/migrations/010_challenge_cash.sql
psql $DATABASE_URL -f packages/api/src/db/migrations/011_dividend_credited_at.sql
psql $DATABASE_URL -f packages/api/src/db/migrations/012_split_events.sql
psql $DATABASE_URL -f packages/api/src/db/migrations/013_agent_reactions.sql
psql $DATABASE_URL -f packages/api/src/db/migrations/014_portfolio_reset_receipts.sql
```

All are idempotent — safe to re-run.

| Migration | What it adds |
|---|---|
| 008 | `current_prices` — live price cache for leaderboard and challenge P&L |
| 009 | `scheduled_jobs` — restart-safe delayed job queue (Marcus intro push) |
| 010 | `challenge_cash` column on `challenges` — isolated challenge balance |
| 011 | `credited_at` column on `dividend_events` — idempotency guard |
| 012 | `split_events` — stock split detection and adjustment tracking |
| 013 | `agent_reactions` — per-trade agent reaction messages |
| 014 | `portfolio_reset_receipts` — prevents double-spend on reset IAP |

---

## 9. Universal Links (Deep Links)

Two URLs must deep-link into the app:
- `https://mockket.app/recommendation/{id}` → RecommendationScreen
- `https://mockket.app/challenge/{token}` → ChallengeInviteScreen

- [ ] Host `/.well-known/apple-app-site-association` at `https://mockket.app` with your app's bundle ID
- [ ] Host `/.well-known/assetlinks.json` at `https://mockket.app` with your Android package name
- [ ] Add `associatedDomains: ["applinks:mockket.app"]` to `app.json` under `ios`
- [ ] Add an `intentFilters` entry for `https://mockket.app` to `app.json` under `android`
- [ ] Rebuild the app after making these changes

---

## 10. Pre-Deploy Smoke Test

Run this on a real device (not simulator) after deploying the backend and running migrations.

**Auth & FTUE**
- [ ] Sign up with email → Mission cards appear on Home
- [ ] Marcus intro push arrives within ~2 minutes of signup
- [ ] Sign out and sign in again — session restores correctly

**Trading**
- [ ] Search for a stock on Markets → quote shows bid/ask
- [ ] Execute a buy → holdings appear in Portfolio, cash decreases
- [ ] Execute a sell → holding reduces, cash increases
- [ ] Attempt a buy with insufficient cash → error shown, trade blocked

**Agents**
- [ ] Hire Marcus in advisory mode → no error
- [ ] Wait for next market open (or trigger `generateRecommendations` manually) → recommendation push arrives
- [ ] Approve recommendation → trade executes, rationale revealed post-action
- [ ] Hire Marcus in autopilot mode → agent trades appear in Portfolio after rebalance cron runs

**Challenges**
- [ ] Start a challenge → cash drawn from main portfolio, challenge balance shown
- [ ] Trade within challenge → challenge cash changes, main portfolio unaffected
- [ ] Generate a friend invite link → link opens ChallengeInviteScreen

**IAP & Reset**
- [ ] Trigger sandbox purchase of `mockket_reset` → webhook fires, row in `portfolio_reset_receipts`
- [ ] Complete reset → cash resets to $100,000, agent hires paused, trade history preserved

**Push notifications**
- [ ] Marcus intro push arrives on real device (iOS + Android)
- [ ] Recommendation push arrives and tapping it opens RecommendationScreen

**Leaderboard**
- [ ] Opt in to leaderboard → appear in top 50 list with correct return %

---

## 11. App Store / Play Store

- [ ] Build: `eas build --platform all --profile production`
- [ ] Submit iOS build to **TestFlight** for internal testing
- [ ] Submit Android build to **Play Store internal testing track**
- [ ] Run full smoke test (section 10) on TestFlight and Play builds
- [ ] Submit for **App Store review**
- [ ] Submit for **Google Play review**
