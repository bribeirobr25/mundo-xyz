CREATE TABLE IF NOT EXISTS world (
  id int PRIMARY KEY CHECK (id = 1),
  placement_revision bigint NOT NULL,
  feed_sequence bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS authors (
  id uuid PRIMARY KEY,
  pseudonym text NOT NULL,
  skeleton text NOT NULL UNIQUE,
  system boolean NOT NULL DEFAULT false,
  disabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS author_roles (
  author_id uuid PRIMARY KEY REFERENCES authors(id),
  role text NOT NULL
);

CREATE TABLE IF NOT EXISTS role_events (
  id uuid PRIMARY KEY,
  author_id uuid NOT NULL,
  role text NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY,
  author_id uuid NOT NULL REFERENCES authors(id),
  secret_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);

CREATE TABLE IF NOT EXISTS recovery_codes (
  id uuid PRIMARY KEY,
  author_id uuid NOT NULL REFERENCES authors(id),
  code_hash text NOT NULL UNIQUE,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invites (
  id uuid PRIMARY KEY,
  code_hash text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES authors(id),
  expires_at timestamptz NOT NULL,
  max_redemptions int NOT NULL,
  redemption_count int NOT NULL DEFAULT 0,
  revoked_at timestamptz
);

CREATE TABLE IF NOT EXISTS publish_grants (
  author_id uuid PRIMARY KEY REFERENCES authors(id),
  invite_id uuid NOT NULL REFERENCES invites(id),
  revoked_at timestamptz
);

CREATE TABLE IF NOT EXISTS author_blocks (
  author_id uuid PRIMARY KEY REFERENCES authors(id),
  blocked boolean NOT NULL
);

CREATE TABLE IF NOT EXISTS pseudonym_hidden (
  author_id uuid PRIMARY KEY REFERENCES authors(id),
  hidden boolean NOT NULL
);

CREATE TABLE IF NOT EXISTS proposals (
  id uuid PRIMARY KEY,
  capability_hash text,
  author_id uuid REFERENCES authors(id),
  private_text text,
  action jsonb,
  base_revision bigint,
  proposal_version int NOT NULL DEFAULT 1,
  catalog_version text NOT NULL,
  policy_version text NOT NULL,
  confirm_key_hash text,
  state text NOT NULL,
  anchor_id uuid,
  parent_contribution_id uuid,
  placement_skip int NOT NULL DEFAULT 0,
  interpret_seq int NOT NULL DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contributions (
  id uuid PRIMARY KEY,
  proposal_id uuid UNIQUE REFERENCES proposals(id),
  author_id uuid NOT NULL REFERENCES authors(id),
  parent_contribution_id uuid,
  approved_text text,
  anchor_object_id uuid,
  visibility text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS placed_objects (
  id uuid PRIMARY KEY,
  catalog_asset_id text NOT NULL,
  catalog_version text NOT NULL,
  x int NOT NULL,
  y int NOT NULL,
  footprint_w int NOT NULL,
  footprint_h int NOT NULL,
  state text NOT NULL,
  contribution_id uuid NOT NULL REFERENCES contributions(id),
  hidden boolean NOT NULL DEFAULT false,
  relation text,
  anchor_object_id uuid
);

CREATE TABLE IF NOT EXISTS object_relations (
  id uuid PRIMARY KEY,
  contribution_id uuid NOT NULL REFERENCES contributions(id),
  from_id uuid NOT NULL,
  to_id uuid NOT NULL,
  kind text NOT NULL
);

CREATE TABLE IF NOT EXISTS narrative_states (
  id uuid PRIMARY KEY,
  object_id uuid NOT NULL,
  contribution_id uuid NOT NULL REFERENCES contributions(id),
  state_key text NOT NULL
);

CREATE TABLE IF NOT EXISTS idempotency (
  author_id uuid NOT NULL,
  key text NOT NULL,
  fingerprint text NOT NULL,
  request jsonb NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (author_id, key)
);

CREATE TABLE IF NOT EXISTS moderation_decisions (
  id uuid PRIMARY KEY,
  feed_sequence bigint NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  action text NOT NULL,
  reason text,
  actor_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS author_cursors (
  author_id uuid PRIMARY KEY REFERENCES authors(id),
  seen_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS budget_months (
  month text PRIMARY KEY,
  reserved_usd numeric NOT NULL DEFAULT 0,
  spent_usd numeric NOT NULL DEFAULT 0,
  eval_reserved_usd numeric NOT NULL DEFAULT 0,
  eval_spent_usd numeric NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS budget_reservations (
  id uuid PRIMARY KEY,
  month text NOT NULL,
  amount_usd numeric NOT NULL,
  eval boolean NOT NULL DEFAULT false,
  status text NOT NULL,
  actual_usd numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rate_buckets (
  bucket text PRIMARY KEY,
  count int NOT NULL,
  window_start timestamptz NOT NULL
);

ALTER TABLE world ENABLE ROW LEVEL SECURITY;
ALTER TABLE world FORCE ROW LEVEL SECURITY;
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE authors FORCE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions FORCE ROW LEVEL SECURITY;
ALTER TABLE placed_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE placed_objects FORCE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals FORCE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE recovery_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_codes FORCE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites FORCE ROW LEVEL SECURITY;
ALTER TABLE publish_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE publish_grants FORCE ROW LEVEL SECURITY;
ALTER TABLE idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency FORCE ROW LEVEL SECURITY;
ALTER TABLE budget_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_reservations FORCE ROW LEVEL SECURITY;
