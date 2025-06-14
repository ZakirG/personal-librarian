-- enable UUIDs once per DB
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS citext;

-------------------------------
-- users & profile
-------------------------------
CREATE TABLE users (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         CITEXT      NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_profiles (
    user_id       UUID  PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    first_name    TEXT,
    last_name     TEXT,
    goal_summary  TEXT,
    global_rules  TEXT,
    timezone      TEXT,
    daily_report_at TIME       -- optional "send my report around 09:00"
);

-------------------------------
-- uploads & chunks
-------------------------------
CREATE TABLE documents (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT,
    file_type   TEXT,
    storage_uri TEXT,
    status      TEXT NOT NULL CHECK (status IN ('uploaded','parsed','embedded')),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE content_source AS ENUM ('document_chunk','llm_report','user_feedback');

CREATE TABLE content_items (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
    source_type  content_source NOT NULL,
    source_id    UUID NOT NULL,
    chunk_index  INT  DEFAULT 0,
    text         TEXT NOT NULL,
    pinecone_id  TEXT UNIQUE,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-------------------------------
-- AI reports & feedback
-------------------------------
CREATE TABLE llm_reports (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     TEXT NOT NULL,
    title       TEXT,
    content     TEXT NOT NULL,
    source_urls JSONB,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE report_feedback (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id  UUID REFERENCES llm_reports(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL,
    rating     INT  CHECK (rating BETWEEN 1 AND 5),
    comments   TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-------------------------------
-- prompt history (optional)
-------------------------------
CREATE TABLE prompt_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         TEXT NOT NULL,
    prompt          TEXT NOT NULL,
    llm_response_id UUID REFERENCES llm_reports(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- helpful indexes
CREATE INDEX ON documents(user_id);
CREATE INDEX ON llm_reports(user_id, created_at DESC);
CREATE INDEX ON content_items(user_id);

