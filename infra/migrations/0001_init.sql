-- infra/migrations/0001_init.sql
-- Raw SQL migration: source of truth for schema, RLS, and vector indexes.
-- Run: psql $DATABASE_URL -f infra/migrations/0001_init.sql
-- Then: cd apps/api-server && npx prisma generate

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ────────────────────────────────────────
-- TENANTS
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────
-- PHONE_NUMBERS
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS phone_numbers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  number      TEXT NOT NULL,
  provider    TEXT NOT NULL DEFAULT 'twilio',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, number)
);

-- ────────────────────────────────────────
-- USERS
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  password_hash   TEXT NOT NULL,
  name            TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'viewer',
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- ────────────────────────────────────────
-- STAFF_CONTACTS
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_contacts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  department  TEXT,
  phone       TEXT,
  email       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────
-- FAQS
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS faqs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  category    TEXT,
  language    TEXT NOT NULL DEFAULT 'en',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────
-- DOCUMENTS
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  file_key    TEXT NOT NULL,
  mime_type   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────
-- DOCUMENT_CHUNKS (with pgvector embedding)
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_chunks (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index  INT NOT NULL,
  text         TEXT NOT NULL,
  embedding    vector(1536),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW index for fast cosine similarity search on embeddings
CREATE INDEX IF NOT EXISTS idx_doc_chunks_embedding
  ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- ────────────────────────────────────────
-- CALLS
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calls (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone_number_id     UUID REFERENCES phone_numbers(id),
  caller_number       TEXT NOT NULL,
  channel             TEXT NOT NULL DEFAULT 'voice',
  language            TEXT NOT NULL DEFAULT 'en',
  status              TEXT NOT NULL DEFAULT 'active',
  issue_category      TEXT,
  confidence_score    NUMERIC(4,3),
  duration_seconds    INT,
  recording_key       TEXT,
  summary             TEXT,
  follow_up_required  BOOLEAN NOT NULL DEFAULT FALSE,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at            TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calls_tenant_started
  ON calls(tenant_id, started_at DESC);

-- ────────────────────────────────────────
-- TRANSCRIPT_TURNS
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transcript_turns (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  call_id     UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  turn_index  INT NOT NULL,
  role        TEXT NOT NULL,
  text        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────
-- AI_RESPONSES
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_responses (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  call_id          UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  turn_index       INT NOT NULL,
  answer_text      TEXT NOT NULL,
  confidence_score NUMERIC(4,3) NOT NULL,
  issue_category   TEXT,
  should_escalate  BOOLEAN NOT NULL DEFAULT FALSE,
  language         TEXT NOT NULL DEFAULT 'en',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────
-- ESCALATIONS
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS escalations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  call_id          UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  reason           TEXT,
  assigned_to      UUID REFERENCES staff_contacts(id),
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────
-- SETTINGS
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  greeting_text    TEXT,
  escalation_email TEXT,
  default_language TEXT NOT NULL DEFAULT 'en',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────
-- ROW-LEVEL SECURITY
-- ────────────────────────────────────────
ALTER TABLE phone_numbers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_contacts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls             ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_turns  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_responses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings          ENABLE ROW LEVEL SECURITY;

-- Policy helper: tenant_id must match current session config
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'phone_numbers','users','staff_contacts','faqs','documents',
    'document_chunks','calls','transcript_turns','ai_responses',
    'escalations','settings'
  ] LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS tenant_isolation ON %I;
       CREATE POLICY tenant_isolation ON %I
         USING (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::UUID);',
      tbl, tbl
    );
  END LOOP;
END
$$;
