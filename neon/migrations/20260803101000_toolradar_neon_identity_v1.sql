-- ToolRadar Neon append-only guards and runtime identity v1.
CREATE OR REPLACE FUNCTION public.toolradar_reject_immutable_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$function$;

DROP TRIGGER IF EXISTS toolradar_source_revisions_append_only
  ON public.toolradar_source_revisions;
CREATE TRIGGER toolradar_source_revisions_append_only
BEFORE UPDATE OR DELETE ON public.toolradar_source_revisions
FOR EACH ROW EXECUTE FUNCTION public.toolradar_reject_immutable_mutation();

DROP TRIGGER IF EXISTS toolradar_metric_snapshots_append_only
  ON public.toolradar_metric_snapshots;
CREATE TRIGGER toolradar_metric_snapshots_append_only
BEFORE UPDATE OR DELETE ON public.toolradar_metric_snapshots
FOR EACH ROW EXECUTE FUNCTION public.toolradar_reject_immutable_mutation();

CREATE OR REPLACE FUNCTION public.initialize_toolradar_runtime_identity_v1(
  p_project_id text,
  p_branch_id text,
  p_database_name text,
  p_installation_id uuid
)
RETURNS public.toolradar_runtime_identity
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  foreign_objects text[];
  existing public.toolradar_runtime_identity;
  result public.toolradar_runtime_identity;
BEGIN
  IF p_project_id IS NULL OR p_project_id !~ '^[a-z0-9-]{6,80}$' THEN
    RAISE EXCEPTION 'p_project_id is invalid';
  END IF;
  IF p_branch_id IS NULL OR p_branch_id !~ '^[a-z0-9-]{6,80}$' THEN
    RAISE EXCEPTION 'p_branch_id is invalid';
  END IF;
  IF p_database_name IS NULL OR length(btrim(p_database_name)) = 0 THEN
    RAISE EXCEPTION 'p_database_name is required';
  END IF;
  IF p_installation_id IS NULL THEN
    RAISE EXCEPTION 'p_installation_id is required';
  END IF;

  SELECT * INTO existing
  FROM public.toolradar_runtime_identity
  WHERE singleton = true;

  IF existing.singleton THEN
    IF existing.provider <> 'neon'
       OR existing.project_id <> p_project_id
       OR existing.branch_id <> p_branch_id
       OR existing.database_name <> p_database_name
       OR existing.installation_id <> p_installation_id
       OR existing.product_code <> 'global-tool-radar' THEN
      RAISE EXCEPTION 'ToolRadar runtime identity is already bound differently';
    END IF;
    RETURN existing;
  END IF;

  SELECT array_agg(format('%I.%I', namespace.nspname, relation.relname)
                   ORDER BY relation.relname)
  INTO foreign_objects
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relkind IN ('r', 'p', 'v', 'm', 'f')
    AND relation.relname NOT LIKE 'toolradar\_%' ESCAPE '\'
    AND relation.relname NOT IN ('spatial_ref_sys');

  IF coalesce(pg_catalog.cardinality(foreign_objects), 0) > 0 THEN
    RAISE EXCEPTION
      'ToolRadar requires a dedicated Neon database; foreign public objects found: %',
      array_to_string(foreign_objects[1:20], ', ');
  END IF;

  INSERT INTO public.toolradar_runtime_identity (
    singleton, product_code, provider, project_id, branch_id,
    database_name, installation_id, schema_version
  ) VALUES (
    true, 'global-tool-radar', 'neon', p_project_id, p_branch_id,
    p_database_name, p_installation_id, 1
  ) RETURNING * INTO result;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_toolradar_runtime_identity_v1()
RETURNS SETOF public.toolradar_runtime_identity
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT identity.*
  FROM public.toolradar_runtime_identity identity
  WHERE identity.singleton = true;
$function$;
