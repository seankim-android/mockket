# LAUNCH.md — Pre-Launch Checklist

Everything that must be done before the first production release. Work through each section in order.

---

## 1. Database Migrations

The database is Supabase's managed Postgres. Migrations are plain SQL files run directly against it.

**Get your connection string:** Supabase dashboard → Project Settings → Database → Connection string → URI mode. This is your `DATABASE_URL`.

**Option A — SQL editor (easiest):** Paste each migration file into Supabase dashboard → SQL Editor → New query → Run. Do them in order (008 → 014).

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

All migrations are idempotent (`IF NOT EXISTS` / `ON CONFLICT DO NOTHING`) — safe to re-run.

What each adds:
| Migration | What it adds |
|---|---|
| 008 | `current_prices` table — cache for leaderboard and challenge P&L |
| 009 | `scheduled_jobs` table — restart-safe delayed job queue (Marcus intro push) |
| 010 | `challenge_cash` column on `challenges` — isolated challenge balance |
| 011 | `credited_at` column on `dividend_events` — idempotency guard for dividend credits |
| 012 | `split_events` table — stock split detection and adjustment tracking |
| 013 | `agent_reactions` table — stores per-trade agent reaction messages |
| 014 | `portfolio_reset_receipts` table — prevents double-spend on reset IAP |

---

## 2. Environment Variables

Set all of the following in your production environment. See `SETUP.md` for the full list with descriptions.

- [ ] `ALPACA_API_KEY`
- [ ] `ALPACA_API_SECRET`
- [ ] `ALPACA_BASE_URL`
- [ ] `DATABASE_URL`
- [ ] `REDIS_URL`
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `SUPABASE_JWT_SECRET`
- [ ] `FIREBASE_PROJECT_ID`
- [ ] `FIREBASE_SERVICE_ACCOUNT` (full service account JSON as a single-line string)
- [ ] `REVENUECAT_SECRET_KEY`
- [ ] `POLYGON_API_KEY` (optional — dividends/earnings/splits won't run without it)

---

## 3. Supabase

- [ ] Enable **Apple** OAuth provider (Supabase dashboard > Authentication > Providers)
- [ ] Enable **Google** OAuth provider
- [ ] Add your production domain to the allowed redirect URLs
- [ ] Copy `SUPABASE_JWT_SECRET` from Settings > API > JWT Secret

---

## 4. Firebase

- [ ] Create a Firebase project (or use existing)
- [ ] Enable **Cloud Messaging** (FCM)
- [ ] Generate a service account key: Firebase console > Project settings > Service accounts > Generate new private key
- [ ] Set `FIREBASE_SERVICE_ACCOUNT` to the full JSON content as a single line (no newlines)
- [ ] Set `FIREBASE_PROJECT_ID`

---

## 5. RevenueCat + IAP

- [ ] Create a RevenueCat project and link your App Store Connect + Google Play apps
- [ ] Create the `mockket_reset` consumable product ($0.99) in **App Store Connect** and **Google Play Console**
- [ ] Add `mockket_reset` as a product in RevenueCat and attach it to an Entitlement
- [ ] Configure the RevenueCat webhook to point to `https://your-backend/webhooks/revenuecat`
- [ ] Copy the RevenueCat server-side secret key → `REVENUECAT_SECRET_KEY`
- [ ] Test a sandbox purchase end-to-end (purchase → webhook fires → `portfolio_reset_receipts` row inserted → reset succeeds)

---

## 6. Universal Links (Deep Links)

Two deep link targets must work before launch:
- `https://mockket.app/recommendation/{id}` → RecommendationScreen
- `https://mockket.app/challenge/{token}` → ChallengeInviteScreen

Setup:
- [ ] Host `/.well-known/apple-app-site-association` at `https://mockket.app` (iOS)
- [ ] Host `/.well-known/assetlinks.json` at `https://mockket.app` (Android)
- [ ] Add `associatedDomains: ["applinks:mockket.app"]` to `app.json` (iOS)
- [ ] Add `intentFilters` for `https://mockket.app` to `app.json` (Android)
- [ ] Rebuild the app and verify a tap on a recommendation push notification opens the correct screen

---

## 7. Alpaca

- [ ] Confirm paper trading endpoint: `ALPACA_BASE_URL=https://paper-api.alpaca.markets`
- [ ] Verify API key has access to quotes and WebSocket streaming
- [ ] Test `GET /v2/stocks/AAPL/quotes/latest` returns `ap` (ask) and `bp` (bid) fields

---

## 8. Polygon.io (Optional)

Without this, dividends, earnings badges, and stock splits will not be detected. The app still works — these features just silently skip.

- [ ] Sign up at polygon.io (free tier is sufficient)
- [ ] Set `POLYGON_API_KEY`
- [ ] Verify nightly sync cron runs and populates `dividend_events`, `earnings_calendar`, `split_events`

---

## 9. Pre-Deploy Smoke Test

Before opening to users:

- [ ] Deploy backend to production
- [ ] Run all migrations (section 1)
- [ ] Create a test account → verify FTUE flow (Mission cards appear, Marcus intro push fires ~2 min after signup)
- [ ] Make a paper trade → verify holdings update, reactions fire if applicable
- [ ] Hire Marcus in advisory mode → verify recommendation appears next market open
- [ ] Start a challenge → verify challenge cash is isolated from main portfolio
- [ ] Trigger a portfolio reset (sandbox IAP) → verify cash resets, agent hires pause, history preserved
- [ ] Verify push notifications arrive on a real device (iOS + Android)
- [ ] Verify leaderboard shows correct portfolio values (not cost basis)

---

## 10. App Store / Play Store

- [ ] Build production app: `eas build --platform all --profile production`
- [ ] Submit to **TestFlight** for internal testing
- [ ] Submit to **Play Store internal testing track**
- [ ] Run smoke test on TestFlight + Play builds (not simulator)
- [ ] Submit for App Store review
- [ ] Submit for Google Play review
