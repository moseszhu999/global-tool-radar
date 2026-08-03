-- ToolRadar YouTube Watchlist Runtime v1
-- Owns channel scheduling, worker leases, ingestion runs, and read-only snapshot projection.
-- It does not own content generation, browser automation, account credentials, or publishing.

create table if not exists public.toolradar_youtube_channel_watchlist (
  id uuid primary key default gen_random_uuid(),
  channel_id text not null unique check (length(btrim(channel_id)) > 0),
  title text null,
  uploads_playlist_id text null,
  status text not null default 'active' check (status in ('active', 'paused', 'rejected')),
  scan_interval_minutes integer not null default 120 check (
    scan_interval_minutes between 60 and 10080
  ),
  next_scan_at timestamptz not null default now(),
  last_scan_at timestamptz null,
  last_success_at timestamptz null,
  consecutive_failures integer not null default 0 check (consecutive_failures >= 0),
  last_error_code text null,
  last_error_message text null,
  lease_owner text null,
  lease_expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (lease_owner is null and lease_expires_at is null)
    or (lease_owner is not null and lease_expires_at is not null)
  )
);

create index if not exists toolradar_youtube_watchlist_due_idx
  on public.toolradar_youtube_channel_watchlist (status, next_scan_at, lease_expires_at);

create table if not exists public.toolradar_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null references public.toolradar_youtube_channel_watchlist(id),
  worker_id text not null check (length(btrim(worker_id)) > 0),
  status text not null check (status in ('started', 'succeeded', 'failed')),
  started_at timestamptz not null,
  finished_at timestamptz null,
  scanned_video_count integer not null default 0 check (scanned_video_count >= 0),
  persisted_revision_count integer not null default 0 check (persisted_revision_count >= 0),
  persisted_snapshot_count integer not null default 0 check (persisted_snapshot_count >= 0),
  error_code text null,
  error_message text null,
  created_at timestamptz not null default now(),
  check (
    (status = 'started' and finished_at is null)
    or (status in ('succeeded', 'failed') and finished_at is not null)
  )
);

create index if not exists toolradar_ingestion_runs_watchlist_idx
  on public.toolradar_ingestion_runs (watchlist_id, started_at desc);

create or replace function public.claim_toolradar_youtube_watchlist_v1(
  p_worker_id text,
  p_limit integer default 10,
  p_now timestamptz default now(),
  p_lease_minutes integer default 15
)
returns setof public.toolradar_youtube_channel_watchlist
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_worker_id is null or length(btrim(p_worker_id)) = 0 then
    raise exception 'p_worker_id is required';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'p_limit must be between 1 and 100';
  end if;
  if p_lease_minutes is null or p_lease_minutes < 1 or p_lease_minutes > 120 then
    raise exception 'p_lease_minutes must be between 1 and 120';
  end if;
  if p_now is null then
    raise exception 'p_now is required';
  end if;

  return query
  with due as (
    select id
    from public.toolradar_youtube_channel_watchlist
    where status = 'active'
      and next_scan_at <= p_now
      and (lease_expires_at is null or lease_expires_at <= p_now)
    order by next_scan_at asc, id asc
    for update skip locked
    limit p_limit
  )
  update public.toolradar_youtube_channel_watchlist watch
  set lease_owner = p_worker_id,
      lease_expires_at = p_now + make_interval(mins => p_lease_minutes),
      updated_at = p_now
  from due
  where watch.id = due.id
  returning watch.*;
end;
$$;

create or replace function public.complete_toolradar_youtube_scan_v1(
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
returns public.toolradar_youtube_channel_watchlist
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.toolradar_youtube_channel_watchlist;
begin
  if p_next_scan_at <= p_at then
    raise exception 'p_next_scan_at must be later than p_at';
  end if;

  update public.toolradar_youtube_channel_watchlist
  set title = p_title,
      uploads_playlist_id = p_uploads_playlist_id,
      next_scan_at = p_next_scan_at,
      last_scan_at = p_at,
      last_success_at = p_at,
      consecutive_failures = 0,
      last_error_code = null,
      last_error_message = null,
      lease_owner = null,
      lease_expires_at = null,
      updated_at = p_at
  where id = p_watchlist_id
    and lease_owner = p_worker_id
  returning * into result;

  if result.id is null then
    raise exception 'watchlist lease is not owned by worker';
  end if;

  update public.toolradar_ingestion_runs
  set status = 'succeeded',
      finished_at = p_at,
      scanned_video_count = p_scanned_video_count,
      persisted_revision_count = p_persisted_revision_count,
      persisted_snapshot_count = p_persisted_snapshot_count,
      error_code = null,
      error_message = null
  where id = p_run_id
    and watchlist_id = p_watchlist_id
    and worker_id = p_worker_id
    and status = 'started';

  if not found then
    raise exception 'started ingestion run was not found';
  end if;
  return result;
end;
$$;

create or replace function public.fail_toolradar_youtube_scan_v1(
  p_watchlist_id uuid,
  p_run_id uuid,
  p_worker_id text,
  p_at timestamptz,
  p_next_scan_at timestamptz,
  p_error_code text,
  p_error_message text
)
returns public.toolradar_youtube_channel_watchlist
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.toolradar_youtube_channel_watchlist;
begin
  if p_next_scan_at <= p_at then
    raise exception 'p_next_scan_at must be later than p_at';
  end if;

  update public.toolradar_youtube_channel_watchlist
  set next_scan_at = p_next_scan_at,
      last_scan_at = p_at,
      consecutive_failures = consecutive_failures + 1,
      last_error_code = left(p_error_code, 120),
      last_error_message = left(p_error_message, 500),
      lease_owner = null,
      lease_expires_at = null,
      updated_at = p_at
  where id = p_watchlist_id
    and lease_owner = p_worker_id
  returning * into result;

  if result.id is null then
    raise exception 'watchlist lease is not owned by worker';
  end if;

  update public.toolradar_ingestion_runs
  set status = 'failed',
      finished_at = p_at,
      error_code = left(p_error_code, 120),
      error_message = left(p_error_message, 500)
  where id = p_run_id
    and watchlist_id = p_watchlist_id
    and worker_id = p_worker_id
    and status = 'started';

  if not found then
    raise exception 'started ingestion run was not found';
  end if;
  return result;
end;
$$;

create or replace function public.get_toolradar_youtube_snapshot_series_v1(
  p_since timestamptz,
  p_limit integer default 5000
)
returns table (
  source_identity_id uuid,
  external_id text,
  title text,
  published_at timestamptz,
  channel_id text,
  captured_at timestamptz,
  view_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with latest_revision as (
    select distinct on (revision.source_identity_id)
      revision.source_identity_id,
      revision.title,
      revision.published_at,
      revision.raw_payload
    from public.toolradar_source_revisions revision
    join public.toolradar_source_identities identity
      on identity.id = revision.source_identity_id
    where identity.source_type = 'youtube_video'
    order by revision.source_identity_id, revision.captured_at desc, revision.id desc
  ), limited as (
    select
      identity.id as source_identity_id,
      identity.external_id,
      latest_revision.title,
      latest_revision.published_at,
      latest_revision.raw_payload #>> '{snippet,channelId}' as channel_id,
      snapshot.captured_at,
      nullif(snapshot.metrics ->> 'viewCount', '')::bigint as view_count
    from public.toolradar_metric_snapshots snapshot
    join public.toolradar_source_identities identity
      on identity.id = snapshot.source_identity_id
    join latest_revision
      on latest_revision.source_identity_id = identity.id
    where identity.source_type = 'youtube_video'
      and snapshot.captured_at >= p_since
    order by snapshot.captured_at desc
    limit greatest(1, least(coalesce(p_limit, 5000), 20000))
  )
  select * from limited
  order by source_identity_id, captured_at;
$$;

alter table public.toolradar_youtube_channel_watchlist enable row level security;
alter table public.toolradar_ingestion_runs enable row level security;

revoke all on function public.claim_toolradar_youtube_watchlist_v1(text, integer, timestamptz, integer)
  from public, anon, authenticated;
revoke all on function public.complete_toolradar_youtube_scan_v1(uuid, uuid, text, timestamptz, timestamptz, text, text, integer, integer, integer)
  from public, anon, authenticated;
revoke all on function public.fail_toolradar_youtube_scan_v1(uuid, uuid, text, timestamptz, timestamptz, text, text)
  from public, anon, authenticated;
revoke all on function public.get_toolradar_youtube_snapshot_series_v1(timestamptz, integer)
  from public, anon, authenticated;

grant execute on function public.claim_toolradar_youtube_watchlist_v1(text, integer, timestamptz, integer)
  to service_role;
grant execute on function public.complete_toolradar_youtube_scan_v1(uuid, uuid, text, timestamptz, timestamptz, text, text, integer, integer, integer)
  to service_role;
grant execute on function public.fail_toolradar_youtube_scan_v1(uuid, uuid, text, timestamptz, timestamptz, text, text)
  to service_role;
grant execute on function public.get_toolradar_youtube_snapshot_series_v1(timestamptz, integer)
  to service_role;

-- No anon/authenticated table policies are created. The worker-only service role owns runtime access.
