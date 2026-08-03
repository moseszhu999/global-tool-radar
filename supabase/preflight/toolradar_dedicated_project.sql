-- Run this read-only query before applying ToolRadar migrations to a Supabase project.
-- A dedicated target returns zero rows. Any returned object means deployment must stop.

select
  namespace.nspname as schema_name,
  relation.relname as object_name,
  relation.relkind as object_kind
from pg_catalog.pg_class relation
join pg_catalog.pg_namespace namespace
  on namespace.oid = relation.relnamespace
where namespace.nspname = 'public'
  and relation.relkind in ('r', 'p', 'v', 'm', 'f')
  and relation.relname not like 'toolradar\_%' escape '\'
  and relation.relname not in ('spatial_ref_sys')
order by relation.relname;
