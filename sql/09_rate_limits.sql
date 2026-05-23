-- Rate limiting table for persistent rate limiting across serverless instances
CREATE TABLE IF NOT EXISTS rate_limits (
  id TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON rate_limits(reset_at);

-- Function to clean up expired rate limit entries
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits WHERE reset_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- RLS para que cada usuario solo vea/modifique sus propios rate limits
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rate_limits_own" ON rate_limits;
CREATE POLICY "rate_limits_own" ON rate_limits FOR ALL USING (id = auth.uid()::text);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON rate_limits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rate_limits TO service_role;
