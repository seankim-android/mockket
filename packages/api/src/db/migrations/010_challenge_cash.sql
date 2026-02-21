ALTER TABLE challenges ADD COLUMN IF NOT EXISTS challenge_cash NUMERIC(18,2) NOT NULL DEFAULT 0;

-- Backfill: set challenge_cash = starting_balance for existing active/completed challenges
UPDATE challenges SET challenge_cash = starting_balance WHERE challenge_cash = 0;
