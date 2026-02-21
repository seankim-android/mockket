-- Track consumed RevenueCat transaction IDs for portfolio resets.
-- Prevents the same purchase from being used more than once.
CREATE TABLE portfolio_reset_receipts (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES users(id),
  rc_transaction_id   TEXT        NOT NULL UNIQUE,
  reset_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portfolio_reset_receipts_user ON portfolio_reset_receipts(user_id);
