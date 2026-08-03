-- ToolRadar Runtime Identity v1
-- Binds worker execution to one dedicated Supabase project and hardens prior
-- SECURITY DEFINER functions. This migration does not create browser access.

create table if not exists public.toolradar_runtime_identity (
  singleton boolean primary key default true check (singleton),
  product_code text not null default 'global-tool-radar'
    check (product_code = 'global-tool-radar'),
  project_ref text not null
    check (project_ref ~ '^[a-z0-9-]{6,64}$'),
  installation_id uuid not null unique,
  schema_version integer not null default 1 check (schema_version >= 1),
  initialized_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.toolradar_runtime_identity enable row level security;

create or replace function public.initialize_toolradar_runtime_identity_v1(
  p_project_ref text,
  p_installation_id uuid
)
returns public.toolradar_runtime_identity
language plpgsql
security definer
set search_path = ''
as $$
declare
  foreign_objects text[];
  existing public.toolradar_runtime_identity;
  result public.toolradar_runtime_identity;
begin
  if p_project_ref is null
     or p_project_ref !~ '^[a-z0-9-]{6,64}$' then
    raise exception 'p_project_ref is invalid';
  end if;
  if p_installation_id is null then
    raise exception 'p_installation_id is required';
  end if;

  select *
  into existing
  from public.toolradar_runtime_identity
  where singleton = true;

  if existing.singleton then
    if existing.project_ref <> p_project_ref
       or existing.installation_id <> p_installation_id
       or existing.product_code <> 'global-tool-radar' then
      raise exception 'ToolRadar runtime identity is already bound differently';
    end if;
    return existing;
  end if;

  select array_agg(format('%I.%I', namespace.nspname, relation.relname)
                   order by relation.relname)
  into foreign_objects
  from pg_catalog.pg_class relation
  join pg_catalog.pg_namespace namespace
    on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relkind in ('r', 'p', 'v', 'm', 'f')
    and relation.relname not like 'toolradar\_%' escape '\'
    and relation.relname not in ('spatial_ref_sys');

  if coalesce(pg_catalog.cardinality(foreign_objects), 0) > 0 then
    raise exception
      'ToolRadar requires a dedicated Supabase project; foreign public objects found: %',
      array_to_string(foreign_objects[1:20], ', ');
  end if;

  insert into public.toolradar_runtime_identity (
    singleton,
    product_code,
    project_ref,
    installation_id,
    schema_version
  )
  values (
    true,
    'global-tool-radar',
    p_project_ref,
    p_installation_id,
    1
  )
  returning * into result;

  return result;
end;
$$;

create or replace function public.get_toolradar_runtime_identity_v1()
returns setof public.toolradar_runtime_identity
language sql
stable
security definer
set search_path = ''
as $$
  select identity.*
  from public.toolradar_runtime_identity identity
  where identity.singleton = true;
$$;

-- Prior privileged functions already use schema-qualified relations. Emptying
-- search_path prevents object-shadowing attacks against unqualified names.
alter function public.claim_toolradar_youtube_watchlist_v1(
  text, integer, timestamptz, integer
) set search_path = '';

alter function public.complete_toolradar_youtube_scan_v1(
  uuid, uuid, text, timestamptz, timestamptz,
  text, text, integer, integer, integer
) set search_path = '';

alter function public.fail_toolradar_youtube_scan_v1(
  uuid, uuid, text, timestamptz, timestamptz, text, text
) set search_path = '';

alter function public.get_toolradar_youtube_snapshot_series_v1(
  timestamptz, integer
) set search_path = '';

revoke all on function public.initialize_toolradar_runtime_identity_v1(text, uuid)
  from public, anon, authenticated;
revoke all on function public.get_toolradar_runtime_identity_v1()
  from public, anon, authenticated;
revoke all on function public.toolradar_reject_immutable_mutation()
  from public, anon, authenticated;

grant execute on function public.initialize_toolradar_runtime_identity_v1(text, uuid)
  to service_role;
grant execute on function public.get_toolradar_runtime_identity_v1()
  to service_role;

-- No anon/authenticated policies are created. Worker access remains service-role only.
