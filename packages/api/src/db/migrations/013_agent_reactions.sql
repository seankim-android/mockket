-- Agent reactions: in-character comments from hired agents after user trades
CREATE TABLE agent_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  agent_id TEXT NOT NULL,
  trade_id UUID REFERENCES trades(id),
  reaction TEXT NOT NULL,
  reacted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_reactions_user_id ON agent_reactions(user_id, reacted_at DESC);
