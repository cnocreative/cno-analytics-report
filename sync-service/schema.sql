CREATE TABLE IF NOT EXISTS oauth_states (
  state_hash TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  client_ref TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY,
  client_ref TEXT NOT NULL,
  provider TEXT NOT NULL,
  access_token_cipher TEXT NOT NULL,
  refresh_token_cipher TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_ref, provider)
);

CREATE TABLE IF NOT EXISTS sync_runs (
  id UUID PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  client_ref TEXT NOT NULL,
  provider TEXT NOT NULL,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  rows JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sync_runs_client_created_idx ON sync_runs(client_ref, created_at DESC);

CREATE TABLE IF NOT EXISTS import_tokens (
  token_hash TEXT PRIMARY KEY,
  client_ref TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  session_hash TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_shares (
  id_hash TEXT PRIMARY KEY,
  client_ref TEXT NOT NULL,
  payload_cipher TEXT NOT NULL,
  password_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS report_shares_client_created_idx ON report_shares(client_ref, created_at DESC);
