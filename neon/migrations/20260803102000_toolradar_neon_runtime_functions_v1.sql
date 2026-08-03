-- ToolRadar Neon atomic capture, leases, run completion, and snapshot projection v1.
CREATE OR REPLACE FUNCTION public.persist_toolradar_source_capture_v1(
  p_source_type text,
  p_external_id text,
  p_source_url text,
  p_title text,
  p_body text,
  p_published_at timestamptz,
  p_captured_at timestamptz,
  p_raw_payload jsonb,
  p_content_hash text,
  p_metrics jsonb DEFAULT NULL
)
RETURNS TABLE (
  source_identity_id uuid,
  revision_inserted boolean,
  snapshot_inserted boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  identity_id uuid;
  inserted_revision_id uuid;
  inserted_snapshot_id uuid;
BEGIN
  INSERT INTO public.toolradar_source_identities AS identity (
    source_type, external_id, source_url
  ) VALUES (
    p_source_type, p_external_id, p_source_url
  )
  ON CONFLICT ON CONSTRAINT toolradar_source_identities_source_type_external_id_key
  DO UPDATE SET source_url = EXCLUDED.source_url
  RETURNING identity.id INTO identity_id;

  INSERT INTO public.toolradar_source_revisions (
    source_identity_id, title, body, published_at, captured_at, raw_payload, content_hash
  ) VALUES (
    identity_id, p_title, coalesce(p_body, ''), p_published_at,
    p_captured_at, p_raw_payload, p_content_hash
  )
  ON CONFLICT ON CONSTRAINT toolradar_source_revisions_source_identity_id_content_hash_key
  DO NOTHING
  RETURNING id INTO inserted_revision_id;

  IF p_metrics IS NOT NULL THEN
    INSERT INTO public.toolradar_metric_snapshots (
      source_identity_id, captured_at, metrics
    ) VALUES (
      identity_id, p_captured_at, p_metrics
    )
    ON CONFLICT ON CONSTRAINT toolradar_metric_snapshots_source_identity_id_captured_at_key
    DO NOTHING
    RETURNING id INTO inserted_snapshot_id;
  END IF;

  source_identity_id := identity_id;
  revision_inserted := inserted_revision_id IS NOT NULL;
  snapshot_inserted := inserted_snapshot_id IS NOT NULL;
  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_toolradar_youtube_watchlist_v1(
  p_worker_id text,
  p_limit integer DEFAULT 10,
  p_now timestamptz DEFAULT now(),
  p_lease_minutes integer DEFAULT 15
)
RETURNS SETOF public.toolradar_youtube_channel_watchlist
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF p_worker_id IS NULL OR length(btrim(p_worker_id)) = 0 THEN
    RAISE EXCEPTION 'p_worker_id is required';
  END IF;
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'p_limit must be between 1 and 100';
  END IF;
  IF p_lease_minutes IS NULL OR p_lease_minutes < 1 OR p_lease_minutes > 120 THEN
    RAISE EXCEPTION 'p_lease_minutes must be between 1 and 120';
  END IF;
  IF p_now IS NULL THEN
    RAISE EXCEPTION 'p_now is required';
  END IF;

  RETURN QUERY
  WITH due AS (
    SELECT id
    FROM public.toolradar_youtube_channel_watchlist
    WHERE status = 'active'
      AND next_scan_at <= p_now
      AND (lease_expires_at IS NULL OR lease_expires_at <= p_now)
    ORDER BY next_scan_at ASC, id ASC
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  )
  UPDATE public.toolradar_youtube_channel_watchlist watch
  SET lease_owner = p_worker_id,
      lease_expires_at = p_now + make_interval(mins => p_lease_minutes),
      updated_at = p_now
  FROM due
  WHERE watch.id = due.id
  RETURNING watch.*;
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_toolradar_youtube_scan_v1(
  p_watchlist_id uuid,
  p_run_id uuid,
  p_worker_id text,
  p_at timestamptz,
  p_next_scan_at timestamptz,
  p_title text,
  p_uploads_playlist_id text,
  p_scanned_video_count integer,
  p_persisted_revision_count integer,
  p_persisted_snapshot_count integer
)
RETURNS public.toolradar_youtube_channel_watchlist
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  result public.toolradar_youtube_channel_watchlist;
BEGIN
  IF p_next_scan_at <= p_at THEN
    RAISE EXCEPTION 'p_next_scan_at must be later than p_at';
  END IF;

  UPDATE public.toolradar_youtube_channel_watchlist
  SET title = p_title,
      uploads_playlist_id = p_uploads_playlist_id,
      next_scan_at = p_next_scan_at,
      last_scan_at = p_at,
      last_success_at = p_at,
      consecutive_failures = 0,
      last_error_code = NULL,
      last_error_message = NULL,
      lease_owner = NULL,
      lease_expires_at = NULL,
      updated_at = p_at
  WHERE id = p_watchlist_id
    AND lease_owner = p_worker_id
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'watchlist lease is not owned by worker';
  END IF;

  UPDATE public.toolradar_ingestion_runs
  SET status = 'succeeded',
      finished_at = p_at,
      scanned_video_count = p_scanned_video_count,
      persisted_revision_count = p_persisted_revision_count,
      persisted_snapshot_count = p_persisted_snapshot_count,
      error_code = NULL,
      error_message = NULL
  WHERE id = p_run_id
    AND watchlist_id = p_watchlist_id
    AND worker_id = p_worker_id
    AND status = 'started';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'started ingestion run was not found';
  END IF;
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fail_toolradar_youtube_scan_v1(
  p_watchlist_id uuid,
  p_run_id uuid,
  p_worker_id text,
  p_at timestamptz,
  p_next_scan_at timestamptz,
  p_error_code text,
  p_error_message text
)
RETURNS public.toolradar_youtube_channel_watchlist
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  result public.toolradar_youtube_channel_watchlist;
BEGIN
  IF p_next_scan_at <= p_at THEN
    RAISE EXCEPTION 'p_next_scan_at must be later than p_at';
  END IF;

  UPDATE public.toolradar_youtube_channel_watchlist
  SET next_scan_at = p_next_scan_at,
      last_scan_at = p_at,
      consecutive_failures = consecutive_failures + 1,
      last_error_code = left(p_error_code, 120),
      last_error_message = left(p_error_message, 500),
      lease_owner = NULL,
      lease_expires_at = NULL,
      updated_at = p_at
  WHERE id = p_watchlist_id
    AND lease_owner = p_worker_id
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'watchlist lease is not owned by worker';
  END IF;

  UPDATE public.toolradar_ingestion_runs
  SET status = 'failed',
      finished_at = p_at,
      error_code = left(p_error_code, 120),
      error_message = left(p_error_message, 500)
  WHERE id = p_run_id
    AND watchlist_id = p_watchlist_id
    AND worker_id = p_worker_id
    AND status = 'started';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'started ingestion run was not found';
  END IF;
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_toolradar_youtube_snapshot_series_v1(
  p_since timestamptz,
  p_limit integer DEFAULT 5000
)
RETURNS TABLE (
  source_identity_id uuid,
  external_id text,
  title text,
  published_at timestamptz,
  channel_id text,
  captured_at timestamptz,
  view_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  WITH latest_revision AS (
    SELECT DISTINCT ON (revision.source_identity_id)
      revision.source_identity_id,
      revision.title,
      revision.published_at,
      revision.raw_payload
    FROM public.toolradar_source_revisions revision
    JOIN public.toolradar_source_identities identity
      ON identity.id = revision.source_identity_id
    WHERE identity.source_type = 'youtube_video'
    ORDER BY revision.source_identity_id, revision.captured_at DESC, revision.id DESC
  ), limited AS (
    SELECT
      identity.id AS source_identity_id,
      identity.external_id,
      latest_revision.title,
      latest_revision.published_at,
      latest_revision.raw_payload #>> '{snippet,channelId}' AS channel_id,
      snapshot.captured_at,
      nullif(snapshot.metrics ->> 'viewCount', '')::bigint AS view_count
    FROM public.toolradar_metric_snapshots snapshot
    JOIN public.toolradar_source_identities identity
      ON identity.id = snapshot.source_identity_id
    JOIN latest_revision
      ON latest_revision.source_identity_id = identity.id
    WHERE identity.source_type = 'youtube_video'
      AND snapshot.captured_at >= p_since
    ORDER BY snapshot.captured_at DESC
    LIMIT greatest(1, least(coalesce(p_limit, 5000), 20000))
  )
  SELECT * FROM limited
  ORDER BY source_identity_id, captured_at;
$function$;
