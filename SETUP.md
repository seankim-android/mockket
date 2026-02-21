# Setup

## Backend (Railway)

**Build Command:**
```
npm install --include=dev && npm run build -w packages/shared -w packages/agents -w packages/api
```

**Start Command:**
```
node packages/api/dist/index.js
```

**Root Directory:** leave empty (monorepo root)

### Environment Variables

```
ALPACA_API_KEY=
ALPACA_API_SECRET=
ALPACA_BASE_URL=https://paper-api.alpaca.markets
COINGECKO_API_KEY=           # optional
DATABASE_URL=                # Supabase connection pooler URL (Transaction mode, port 6543) — required for IPv4 compatibility on Railway
REDIS_URL=
FIREBASE_PROJECT_ID=
FIREBASE_SERVICE_ACCOUNT=    # full JSON as single line (Firebase console > Project settings > Service accounts)
APPLE_CLIENT_ID=             # for Sign in with Apple
REVENUECAT_SECRET_KEY=       # RevenueCat dashboard > API keys > Secret key
POLYGON_API_KEY=             # for dividends, earnings, stock splits (optional)
SUPABASE_URL=
SUPABASE_SECRET_KEY=         # Supabase dashboard > Project Settings > API > Secret key
SUPABASE_JWT_SECRET=         # Supabase dashboard > Settings > API > JWT Secret
```

---

## Mobile (apps/mobile/.env)

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=   # Supabase dashboard > Project Settings > API > Publishable key
EXPO_PUBLIC_REVENUECAT_IOS_KEY=         # RevenueCat dashboard > your iOS app > API keys > Public Apple key
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=     # RevenueCat dashboard > your Android app > API keys > Public Google key
EXPO_PUBLIC_API_URL=                    # your Railway service domain, e.g. https://mockket-production.up.railway.app
```

**Run:**
```
npm run android
npm run ios
```
