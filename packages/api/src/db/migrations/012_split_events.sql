CREATE TABLE IF NOT EXISTS split_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  effective_date DATE NOT NULL,
  ratio NUMERIC(10, 4) NOT NULL,
  applied_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ticker, effective_date)
);
