-- Run with a dedicated migration owner. Runtime must never own these objects.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bc_platform_public') THEN
    CREATE ROLE bc_platform_public NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bc_platform_member') THEN
    CREATE ROLE bc_platform_member NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bc_platform_auth') THEN
    CREATE ROLE bc_platform_auth NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
END $$;

CREATE SCHEMA church_platform;
CREATE SCHEMA church_identity;
REVOKE ALL ON SCHEMA church_platform, church_identity FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA church_platform REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA church_identity REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

CREATE TABLE church_identity.users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE CHECK (email = lower(email) AND length(email) <= 254),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  password_hash text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE church_identity.sessions (
  token_hash text PRIMARY KEY CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  user_id uuid NOT NULL REFERENCES church_identity.users(id),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);
CREATE INDEX sessions_user ON church_identity.sessions(user_id);
CREATE TABLE church_identity.login_attempts (
  key_hash text PRIMARY KEY CHECK (key_hash ~ '^[a-f0-9]{64}$'),
  attempts integer NOT NULL,
  window_start timestamptz NOT NULL
);

CREATE TABLE church_platform.churches (
  id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z][a-z0-9-]{2,59}$'),
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 120),
  tagline text NOT NULL DEFAULT '' CHECK (length(tagline) <= 240),
  primary_color text NOT NULL DEFAULT '#371D2D' CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text NOT NULL DEFAULT '#E4C58B' CHECK (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE church_platform.memberships (
  church_id uuid NOT NULL REFERENCES church_platform.churches(id),
  user_id uuid NOT NULL REFERENCES church_identity.users(id),
  role text NOT NULL CHECK (role IN ('owner','editor','finance')),
  PRIMARY KEY (church_id, user_id)
);
CREATE INDEX memberships_user ON church_platform.memberships(user_id, church_id);

CREATE TABLE church_platform.entries (
  id uuid PRIMARY KEY,
  church_id uuid NOT NULL REFERENCES church_platform.churches(id),
  kind text NOT NULL CHECK (kind IN ('posts','events','campaigns')),
  title text NOT NULL CHECK (length(title) BETWEEN 2 AND 160),
  body text NOT NULL DEFAULT '' CHECK (length(body) <= 20000),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  starts_at timestamptz,
  ends_at timestamptz,
  location text CHECK (length(location) <= 300),
  goal_cents integer CHECK (goal_cents BETWEEN 100 AND 1000000000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (church_id, id),
  CHECK ((kind = 'events' AND starts_at IS NOT NULL AND goal_cents IS NULL)
    OR (kind = 'campaigns' AND goal_cents IS NOT NULL AND starts_at IS NULL AND ends_at IS NULL AND location IS NULL)
    OR (kind = 'posts' AND starts_at IS NULL AND ends_at IS NULL AND location IS NULL AND goal_cents IS NULL)),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);
CREATE INDEX entries_tenant_kind_status ON church_platform.entries(church_id, kind, status, created_at DESC);
CREATE TABLE church_platform.audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  church_id uuid NOT NULL REFERENCES church_platform.churches(id),
  actor_id uuid REFERENCES church_identity.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  changes jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_tenant_created ON church_platform.audit_events(church_id, created_at DESC);

CREATE FUNCTION church_platform.current_user_id() RETURNS uuid LANGUAGE sql STABLE
  SET search_path = pg_catalog AS $$ SELECT nullif(current_setting('app.user_id', true), '')::uuid $$;
CREATE FUNCTION church_platform.current_church_id() RETURNS uuid LANGUAGE sql STABLE
  SET search_path = pg_catalog AS $$ SELECT nullif(current_setting('app.church_id', true), '')::uuid $$;
CREATE FUNCTION church_platform.member_role(target uuid) RETURNS text LANGUAGE sql STABLE
  SET search_path = pg_catalog AS $$
    SELECT role FROM church_platform.memberships
    WHERE church_id = target AND user_id = church_platform.current_user_id()
  $$;

ALTER TABLE church_platform.churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE church_platform.churches FORCE ROW LEVEL SECURITY;
ALTER TABLE church_platform.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE church_platform.memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE church_platform.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE church_platform.entries FORCE ROW LEVEL SECURITY;
ALTER TABLE church_platform.audit_events ENABLE ROW LEVEL SECURITY;
-- Audit is owned by the migration role; only its fixed trigger can append.
-- Owner bypass is used solely inside the SECURITY DEFINER trigger below.

CREATE POLICY church_public ON church_platform.churches FOR SELECT TO bc_platform_public, bc_platform_member
  USING (active);
CREATE POLICY church_owner_update ON church_platform.churches FOR UPDATE TO bc_platform_member
  USING (id = church_platform.current_church_id() AND church_platform.member_role(id) = 'owner')
  WITH CHECK (id = church_platform.current_church_id() AND church_platform.member_role(id) = 'owner');
CREATE POLICY own_memberships ON church_platform.memberships FOR SELECT TO bc_platform_member
  USING (user_id = church_platform.current_user_id());
CREATE POLICY published_entries ON church_platform.entries FOR SELECT TO bc_platform_public
  USING (church_id = church_platform.current_church_id() AND status = 'published'
    AND EXISTS (SELECT 1 FROM church_platform.churches c WHERE c.id = church_id AND c.active));
CREATE POLICY member_entries ON church_platform.entries FOR ALL TO bc_platform_member
  USING (church_id = church_platform.current_church_id()
    AND church_platform.member_role(church_id) = ANY(CASE WHEN kind = 'campaigns' THEN ARRAY['owner','finance'] ELSE ARRAY['owner','editor'] END)
    AND EXISTS (SELECT 1 FROM church_platform.churches c WHERE c.id = church_id AND c.active))
  WITH CHECK (church_id = church_platform.current_church_id()
    AND church_platform.member_role(church_id) = ANY(CASE WHEN kind = 'campaigns' THEN ARRAY['owner','finance'] ELSE ARRAY['owner','editor'] END)
    AND EXISTS (SELECT 1 FROM church_platform.churches c WHERE c.id = church_id AND c.active));
CREATE POLICY audit_owner_read ON church_platform.audit_events FOR SELECT TO bc_platform_member
  USING (church_id = church_platform.current_church_id() AND church_platform.member_role(church_id) = 'owner');

CREATE FUNCTION church_platform.protect_identity() RETURNS trigger LANGUAGE plpgsql
  SET search_path = pg_catalog AS $$ BEGIN
    IF TG_TABLE_NAME = 'entries' THEN
      IF NEW.id <> OLD.id OR NEW.church_id <> OLD.church_id OR NEW.kind <> OLD.kind THEN
        RAISE EXCEPTION 'Immutable identity' USING ERRCODE = '42501';
      END IF;
    ELSE
      IF NEW.id <> OLD.id OR NEW.slug <> OLD.slug THEN
        RAISE EXCEPTION 'Immutable identity' USING ERRCODE = '42501';
      END IF;
    END IF;
    NEW.updated_at := now(); RETURN NEW;
  END $$;
CREATE TRIGGER protect_entry BEFORE UPDATE ON church_platform.entries FOR EACH ROW EXECUTE FUNCTION church_platform.protect_identity();
CREATE TRIGGER protect_church BEFORE UPDATE ON church_platform.churches FOR EACH ROW EXECUTE FUNCTION church_platform.protect_identity();

CREATE FUNCTION church_platform.capture_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = pg_catalog AS $$
  DECLARE previous jsonb; following jsonb; row_data jsonb; tenant uuid;
  BEGIN
    IF TG_OP <> 'INSERT' THEN previous := to_jsonb(OLD); END IF;
    IF TG_OP <> 'DELETE' THEN following := to_jsonb(NEW); END IF;
    row_data := coalesce(following, previous);
    tenant := CASE WHEN TG_TABLE_NAME = 'churches' THEN (row_data->>'id')::uuid ELSE (row_data->>'church_id')::uuid END;
    INSERT INTO church_platform.audit_events(church_id, actor_id, action, entity_type, entity_id, changes)
    VALUES (tenant, church_platform.current_user_id(), lower(TG_OP), TG_TABLE_NAME,
      (row_data->>'id')::uuid, jsonb_build_object('before', previous, 'after', following));
    RETURN coalesce(NEW, OLD);
  END $$;
CREATE TRIGGER audit_entries AFTER INSERT OR UPDATE OR DELETE ON church_platform.entries FOR EACH ROW EXECUTE FUNCTION church_platform.capture_audit();
CREATE TRIGGER audit_churches AFTER UPDATE ON church_platform.churches FOR EACH ROW EXECUTE FUNCTION church_platform.capture_audit();
CREATE FUNCTION church_platform.reject_audit_change() RETURNS trigger LANGUAGE plpgsql
  SET search_path = pg_catalog AS $$ BEGIN RAISE EXCEPTION 'Audit is append only' USING ERRCODE = '42501'; END $$;
CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE ON church_platform.audit_events FOR EACH ROW EXECUTE FUNCTION church_platform.reject_audit_change();

CREATE FUNCTION church_identity.login_record(email_input text)
RETURNS TABLE(id uuid, email text, name text, password_hash text) LANGUAGE sql SECURITY DEFINER
  SET search_path = pg_catalog AS $$ SELECT u.id, u.email, u.name, u.password_hash FROM church_identity.users u WHERE u.email = email_input AND u.active $$;
CREATE FUNCTION church_identity.session_user(hash_input text)
RETURNS TABLE(id uuid, email text, name text) LANGUAGE sql SECURITY DEFINER
  SET search_path = pg_catalog AS $$
    SELECT u.id, u.email, u.name FROM church_identity.sessions s JOIN church_identity.users u ON u.id = s.user_id
    WHERE s.token_hash = hash_input AND s.revoked_at IS NULL AND s.expires_at > now() AND u.active
  $$;
CREATE FUNCTION church_identity.issue_session(user_input uuid, hash_input text, expiry timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$ BEGIN
  IF expiry > now() + interval '24 hours' OR expiry <= now() THEN RAISE EXCEPTION 'Invalid expiry'; END IF;
  INSERT INTO church_identity.sessions(token_hash, user_id, expires_at)
    SELECT hash_input, id, expiry FROM church_identity.users WHERE id = user_input AND active;
END $$;
CREATE FUNCTION church_identity.revoke_session(hash_input text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog AS $$
  UPDATE church_identity.sessions SET revoked_at = now() WHERE token_hash = hash_input AND revoked_at IS NULL
$$;
CREATE FUNCTION church_identity.allow_login(key_input text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
  DECLARE count_now integer;
  BEGIN
    INSERT INTO church_identity.login_attempts(key_hash, attempts, window_start) VALUES(key_input, 1, now())
    ON CONFLICT(key_hash) DO UPDATE SET
      attempts = CASE WHEN church_identity.login_attempts.window_start < now() - interval '10 minutes' THEN 1 ELSE church_identity.login_attempts.attempts + 1 END,
      window_start = CASE WHEN church_identity.login_attempts.window_start < now() - interval '10 minutes' THEN now() ELSE church_identity.login_attempts.window_start END
    RETURNING attempts INTO count_now;
    RETURN count_now <= 20;
  END $$;

REVOKE ALL ON ALL TABLES IN SCHEMA church_platform, church_identity FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA church_platform, church_identity FROM PUBLIC;
GRANT USAGE ON SCHEMA church_platform TO bc_platform_public, bc_platform_member;
GRANT SELECT ON church_platform.churches, church_platform.entries TO bc_platform_public;
GRANT SELECT ON church_platform.churches, church_platform.memberships, church_platform.entries, church_platform.audit_events TO bc_platform_member;
GRANT INSERT, DELETE ON church_platform.entries TO bc_platform_member;
GRANT UPDATE(title, body, status, starts_at, ends_at, location, goal_cents) ON church_platform.entries TO bc_platform_member;
GRANT UPDATE(name, tagline, primary_color, accent_color) ON church_platform.churches TO bc_platform_member;
GRANT EXECUTE ON FUNCTION church_platform.current_church_id() TO bc_platform_public, bc_platform_member;
GRANT EXECUTE ON FUNCTION church_platform.current_user_id(), church_platform.member_role(uuid) TO bc_platform_member;
GRANT USAGE ON SCHEMA church_identity TO bc_platform_auth;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA church_identity TO bc_platform_auth;
