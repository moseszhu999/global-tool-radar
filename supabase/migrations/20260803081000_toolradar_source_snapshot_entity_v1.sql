-- ToolRadar Source Snapshot + Canonical Tool Entity v1
-- Owns stable source identity, immutable source revisions, append-only metrics,
-- canonical tools, and explicit tool-to-source links.

create extension if not exists pgcrypto;

create table if not exists public.toolradar_tools (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null check (length(btrim(canonical_name)) > 0),
  official_domain text not null check (
    official_domain = lower(official_domain)
    and official_domain !~ '[/ :]'
  ),
  status text not null check (status in ('candidate', 'confirmed', 'rejected', 'merged')),
  merged_into_tool_id uuid null references public.toolradar_tools(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (official_domain),
  check (
    (status = 'merged' and merged_into_tool_id is not null)
    or (status <> 'merged' and merged_into_tool_id is null)
  )
);

create table if not exists public.toolradar_source_identities (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (
    source_type in (
      'youtube_video',
      'product_hunt_post',
      'github_repository',
      'github_release',
      'official_page',
      'pricing_page'
    )
  ),
  external_id text not null check (length(btrim(external_id)) > 0),
  source_url text not null check (source_url ~ '^https?://'),
  created_at timestamptz not null default now(),
  unique (source_type, external_id)
);

create table if not exists public.toolradar_source_revisions (
  id uuid primary key default gen_random_uuid(),
  source_identity_id uuid not null references public.toolradar_source_identities(id),
  title text not null check (length(btrim(title)) > 0),
  body text not null default '',
  published_at timestamptz null,
  captured_at timestamptz not null,
  raw_payload jsonb not null,
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique (source_identity_id, content_hash)
);

create index if not exists toolradar_source_revisions_timeline_idx
  on public.toolradar_source_revisions (source_identity_id, captured_at desc);

create table if not exists public.toolradar_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  source_identity_id uuid not null references public.toolradar_source_identities(id),
  captured_at timestamptz not null,
  metrics jsonb not null check (jsonb_typeof(metrics) = 'object'),
  created_at timestamptz not null default now(),
  unique (source_identity_id, captured_at)
);

create index if not exists toolradar_metric_snapshots_timeline_idx
  on public.toolradar_metric_snapshots (source_identity_id, captured_at);

create table if not exists public.toolradar_tool_source_links (
  tool_id uuid not null references public.toolradar_tools(id),
  source_identity_id uuid not null references public.toolradar_source_identities(id),
  match_method text not null check (
    match_method in (
      'same_official_domain',
      'same_product_hunt_domain',
      'explicit_official_link',
      'normalized_name_match',
      'manual_confirmation'
    )
  ),
  decision text not null check (decision in ('candidate', 'confirmed', 'rejected')),
  confidence numeric(4,3) not null check (confidence >= 0 and confidence <= 1),
  confirmed_by uuid null,
  confirmed_at timestamptz null,
  created_at timestamptz not null default now(),
  primary key (tool_id, source_identity_id),
  check (
    (decision = 'confirmed' and confirmed_at is not null)
    or decision <> 'confirmed'
  )
);

create or replace function public.toolradar_reject_immutable_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception '% is append-only', tg_table_name;
end;
$$;

drop trigger if exists toolradar_source_revisions_append_only
  on public.toolradar_source_revisions;
create trigger toolradar_source_revisions_append_only
before update or delete on public.toolradar_source_revisions
for each row execute function public.toolradar_reject_immutable_mutation();

drop trigger if exists toolradar_metric_snapshots_append_only
  on public.toolradar_metric_snapshots;
create trigger toolradar_metric_snapshots_append_only
before update or delete on public.toolradar_metric_snapshots
for each row execute function public.toolradar_reject_immutable_mutation();

alter table public.toolradar_tools enable row level security;
alter table public.toolradar_source_identities enable row level security;
alter table public.toolradar_source_revisions enable row level security;
alter table public.toolradar_metric_snapshots enable row level security;
alter table public.toolradar_tool_source_links enable row level security;

-- No permissive policy is created in v1. Runtime read/write authorization remains
-- closed until the web/worker identity model is introduced in a separate owner.
