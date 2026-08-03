-- ToolRadar Neon tables v1. Dedicated empty database only.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.toolradar_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name text NOT NULL CHECK (length(btrim(canonical_name)) > 0),
  official_domain text NOT NULL CHECK (
    official_domain = lower(official_domain) AND official_domain !~ '[/ :]'
  ),
  status text NOT NULL CHECK (status IN ('candidate', 'confirmed', 'rejected', 'merged')),
  merged_into_tool_id uuid NULL REFERENCES public.toolradar_tools(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (official_domain),
  CHECK (
    (status = 'merged' AND merged_into_tool_id IS NOT NULL)
    OR (status <> 'merged' AND merged_into_tool_id IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.toolradar_source_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (
    source_type IN (
      'youtube_video', 'product_hunt_post', 'github_repository',
      'github_release', 'official_page', 'pricing_page'
    )
  ),
  external_id text NOT NULL CHECK (length(btrim(external_id)) > 0),
  source_url text NOT NULL CHECK (source_url ~ '^https?://'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, external_id)
);

CREATE TABLE IF NOT EXISTS public.toolradar_source_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_identity_id uuid NOT NULL REFERENCES public.toolradar_source_identities(id),
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  body text NOT NULL DEFAULT '',
  published_at timestamptz NULL,
  captured_at timestamptz NOT NULL,
  raw_payload jsonb NOT NULL,
  content_hash text NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_identity_id, content_hash)
);

CREATE TABLE IF NOT EXISTS public.toolradar_metric_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_identity_id uuid NOT NULL REFERENCES public.toolradar_source_identities(id),
  captured_at timestamptz NOT NULL,
  metrics jsonb NOT NULL CHECK (jsonb_typeof(metrics) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_identity_id, captured_at)
);

CREATE TABLE IF NOT EXISTS public.toolradar_tool_source_links (
  tool_id uuid NOT NULL REFERENCES public.toolradar_tools(id),
  source_identity_id uuid NOT NULL REFERENCES public.toolradar_source_identities(id),
  match_method text NOT NULL CHECK (
    match_method IN (
      'same_official_domain', 'same_product_hunt_domain',
      'explicit_official_link', 'normalized_name_match', 'manual_confirmation'
    )
  ),
  decision text NOT NULL CHECK (decision IN ('candidate', 'confirmed', 'rejected')),
  confidence numeric(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  confirmed_by uuid NULL,
  confirmed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tool_id, source_identity_id),
  CHECK (
    (decision = 'confirmed' AND confirmed_at IS NOT NULL)
    OR decision <> 'confirmed'
  )
);

CREATE TABLE IF NOT EXISTS public.toolradar_youtube_channel_watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id text NOT NULL UNIQUE CHECK (length(btrim(channel_id)) > 0),
  title text NULL,
  uploads_playlist_id text NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'rejected')),
  scan_interval_minutes integer NOT NULL DEFAULT 120 CHECK (
    scan_interval_minutes BETWEEN 60 AND 10080
  ),
  next_scan_at timestamptz NOT NULL DEFAULT now(),
  last_scan_at timestamptz NULL,
  last_success_at timestamptz NULL,
  consecutive_failures integer NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0),
  last_error_code text NULL,
  last_error_message text NULL,
  lease_owner text NULL,
  lease_expires_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (lease_owner IS NULL AND lease_expires_at IS NULL)
    OR (lease_owner IS NOT NULL AND lease_expires_at IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.toolradar_ingestion_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id uuid NOT NULL REFERENCES public.toolradar_youtube_channel_watchlist(id),
  worker_id text NOT NULL CHECK (length(btrim(worker_id)) > 0),
  status text NOT NULL CHECK (status IN ('started', 'succeeded', 'failed')),
  started_at timestamptz NOT NULL,
  finished_at timestamptz NULL,
  scanned_video_count integer NOT NULL DEFAULT 0 CHECK (scanned_video_count >= 0),
  persisted_revision_count integer NOT NULL DEFAULT 0 CHECK (persisted_revision_count >= 0),
  persisted_snapshot_count integer NOT NULL DEFAULT 0 CHECK (persisted_snapshot_count >= 0),
  error_code text NULL,
  error_message text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (status = 'started' AND finished_at IS NULL)
    OR (status IN ('succeeded', 'failed') AND finished_at IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.toolradar_runtime_identity (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  product_code text NOT NULL DEFAULT 'global-tool-radar' CHECK (product_code = 'global-tool-radar'),
  provider text NOT NULL DEFAULT 'neon' CHECK (provider = 'neon'),
  project_id text NOT NULL CHECK (project_id ~ '^[a-z0-9-]{6,80}$'),
  branch_id text NOT NULL CHECK (branch_id ~ '^[a-z0-9-]{6,80}$'),
  database_name text NOT NULL CHECK (length(btrim(database_name)) > 0),
  installation_id uuid NOT NULL UNIQUE,
  schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version >= 1),
  initialized_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS toolradar_source_revisions_timeline_idx
  ON public.toolradar_source_revisions (source_identity_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS toolradar_metric_snapshots_timeline_idx
  ON public.toolradar_metric_snapshots (source_identity_id, captured_at);
CREATE INDEX IF NOT EXISTS toolradar_youtube_watchlist_due_idx
  ON public.toolradar_youtube_channel_watchlist (status, next_scan_at, lease_expires_at);
CREATE INDEX IF NOT EXISTS toolradar_ingestion_runs_watchlist_idx
  ON public.toolradar_ingestion_runs (watchlist_id, started_at DESC);
