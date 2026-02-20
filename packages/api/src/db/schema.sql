-- Users (auth managed by Supabase, this extends their profile)
CREATE TABLE users (
  id UUID PRIMARY KEY, -- matches Supabase auth.users.id
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  portfolio_cash NUMERIC(14,2) NOT NULL DEFAULT 100000.00,
  reset_count INTEGER NOT NULL DEFAULT 0,
  leaderboard_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Holdings: current positions per user (or agent segment)
CREATE TABLE holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  agent_hire_id UUID, -- NULL = self-managed, set = agent segment
  challenge_id UUID, -- NULL = main portfolio, set = challenge portfolio
  ticker TEXT NOT NULL,
  quantity NUMERIC(14,6) NOT NULL DEFAULT 0,
  avg_cost NUMERIC(14,4) NOT NULL, -- average cost basis per share
  UNIQUE(user_id, agent_hire_id, challenge_id, ticker)
);

-- Trades: permanent ledger (never deleted)
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  agent_id TEXT, -- agent slug, NULL = user trade
  agent_hire_id UUID,
  ticker TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('buy', 'sell')),
  quantity NUMERIC(14,6) NOT NULL,
  price_at_execution NUMERIC(14,4) NOT NULL,
  rationale TEXT NOT NULL DEFAULT '',
  challenge_id UUID,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agent hires
CREATE TABLE agent_hires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  agent_id TEXT NOT NULL,
  allocated_cash NUMERIC(14,2) NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('advisory', 'autopilot')) DEFAULT 'advisory',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_paused BOOLEAN NOT NULL DEFAULT FALSE,
  hired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paused_at TIMESTAMPTZ
);

-- Agent recommendations
CREATE TABLE agent_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  agent_hire_id UUID NOT NULL REFERENCES agent_hires(id),
  agent_id TEXT NOT NULL,
  challenge_id UUID,
  ticker TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('buy', 'sell')),
  quantity NUMERIC(14,6) NOT NULL,
  rationale TEXT NOT NULL, -- never returned before acted_at is set
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'expired')) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  acted_at TIMESTAMPTZ
);

-- Challenges
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  agent_id TEXT, -- NULL = friend challenge
  opponent_user_id UUID REFERENCES users(id),
  duration TEXT NOT NULL CHECK (duration IN ('1w', '1m', '3m')),
  starting_balance NUMERIC(14,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'completed', 'forfeited', 'expired')) DEFAULT 'pending',
  is_forfeited BOOLEAN NOT NULL DEFAULT FALSE,
  invite_token TEXT UNIQUE,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  winner_id UUID REFERENCES users(id),
  started_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cached market data (dividends, earnings, splits from Polygon)
CREATE TABLE dividend_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  ex_date DATE NOT NULL,
  amount_per_share NUMERIC(10,4) NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ticker, ex_date)
);

CREATE TABLE earnings_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  report_date DATE NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ticker, report_date)
);

-- App version config (force/soft update)
CREATE TABLE app_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'both')),
  version TEXT NOT NULL,
  minimum_version TEXT NOT NULL,
  update_mode TEXT CHECK (update_mode IN ('hard', 'soft')),
  release_date DATE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE changelog_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_version_id UUID NOT NULL REFERENCES app_versions(id),
  type TEXT NOT NULL CHECK (type IN ('new', 'improved', 'fixed')),
  text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- FTUE tracking
CREATE TABLE ftue_progress (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  viewed_marcus_profile BOOLEAN NOT NULL DEFAULT FALSE,
  made_first_trade BOOLEAN NOT NULL DEFAULT FALSE,
  started_challenge BOOLEAN NOT NULL DEFAULT FALSE,
  agent_intro_sent BOOLEAN NOT NULL DEFAULT FALSE,
  first_trade_annotation_shown BOOLEAN NOT NULL DEFAULT FALSE,
  day2_card_shown BOOLEAN NOT NULL DEFAULT FALSE
);

-- PDT tracking (day trades in 5-day window)
CREATE TABLE day_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  ticker TEXT NOT NULL,
  traded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notification preferences
CREATE TABLE notification_prefs (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  advisory_recommendations BOOLEAN NOT NULL DEFAULT TRUE,
  agent_reactions BOOLEAN NOT NULL DEFAULT TRUE,
  challenge_milestones BOOLEAN NOT NULL DEFAULT TRUE,
  portfolio_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  recommendation_expiry BOOLEAN NOT NULL DEFAULT TRUE,
  morning_briefs BOOLEAN NOT NULL DEFAULT TRUE
);

-- FCM tokens
CREATE TABLE fcm_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(token)
);
