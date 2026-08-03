# ToolRadar Dedicated Supabase Runtime Identity v1

## Why this stage exists

ToolRadar must not share a database with TrainingOS or another product. A service-role
worker bypasses RLS, so pointing it at the wrong Supabase URL is a high-impact deployment
error even when every table name is prefixed.

This stage adds two independent gates:

1. the configured project ref must match the project ref extracted from `SUPABASE_URL`;
2. the database must contain a ToolRadar runtime identity matching the expected project
   ref and installation UUID.

Every worker verifies both gates before reading or writing runtime data.

## Dedicated-project bootstrap

1. Create a dedicated Supabase project for ToolRadar.
2. Run `supabase/preflight/toolradar_dedicated_project.sql`.
3. Stop if the query returns any non-ToolRadar public object.
4. Apply all repository migrations in order.
5. Generate one UUID for `TOOLRADAR_INSTALLATION_ID`.
6. Configure:

```text
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<server-only secret>
TOOLRADAR_SUPABASE_PROJECT_REF=<project-ref>
TOOLRADAR_INSTALLATION_ID=<generated UUID>
TOOLRADAR_RUNTIME_INITIALIZE_CONFIRMATION=INITIALIZE_DEDICATED_TOOLRADAR_PROJECT
```

7. Run `npm run runtime:initialize` exactly once.
8. Remove `TOOLRADAR_RUNTIME_INITIALIZE_CONFIRMATION`.
9. Run `npm run runtime:verify`.
10. Only then schedule `npm run worker:youtube`.

Initialization is idempotent for the same project ref and installation UUID. A different
binding fails closed.

## Database guard

`initialize_toolradar_runtime_identity_v1` scans the `public` schema before inserting the
singleton identity. Any table, view, materialized view, partition, or foreign table that
does not use the `toolradar_` prefix blocks initialization. `spatial_ref_sys` is the only
explicit compatibility exception.

Applying migrations to the wrong database is still an operational mistake, but the worker
cannot become active there because runtime initialization is refused.

## Security hardening

- Runtime identity functions are callable only by `service_role`.
- No `anon` or `authenticated` policies are introduced.
- All ToolRadar `SECURITY DEFINER` functions use an empty `search_path`.
- Worker error messages never include the service-role key.
- Project ref and installation UUID are deployment bindings, not secrets.
- `SUPABASE_SERVICE_ROLE_KEY` remains server-only and must never use a public environment
  variable prefix.

## Current limitation

No dedicated Supabase project is created by this repository. Project creation has billing
and organization consequences and must be an explicit infrastructure decision.
