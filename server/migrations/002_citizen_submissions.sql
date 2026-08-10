CREATE TABLE citizen_submissions (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL REFERENCES portal_entities(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK (kind IN ('aspirasi', 'aduan', 'pertanyaan')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'in_progress', 'resolved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX citizen_submissions_entity_created_at
  ON citizen_submissions (entity_id, created_at DESC);

CREATE INDEX citizen_submissions_entity_status_created_at
  ON citizen_submissions (entity_id, status, created_at DESC);

-- Tidak ada policy publik: data pribadi hanya dibaca melalui backend terautentikasi.
-- pg-mem-ignore-start
ALTER TABLE citizen_submissions ENABLE ROW LEVEL SECURITY;
-- pg-mem-ignore-end
