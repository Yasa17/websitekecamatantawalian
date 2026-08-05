CREATE TABLE portal_entities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('kecamatan', 'desa', 'kelurahan')),
  label TEXT NOT NULL,
  short_label TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE admins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin')),
  assigned_entity_id TEXT NOT NULL REFERENCES portal_entities(id) ON DELETE RESTRICT,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX admins_username_case_insensitive
  ON admins (LOWER(username));
CREATE UNIQUE INDEX admins_email_case_insensitive
  ON admins (LOWER(email));

CREATE TABLE admin_sessions (
  token_hash TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX admin_sessions_expires_at ON admin_sessions(expires_at);
