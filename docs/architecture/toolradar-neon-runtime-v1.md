# ToolRadar Neon Runtime v1

## Decision

ToolRadar now uses a dedicated Neon Postgres project. The existing TrainingOS Supabase
project remains untouched. Supabase migrations and adapters in repository history are
legacy evidence only and are not part of the active worker path.

## Runtime boundary

The active flow is:

```text
DATABASE_URL
→ validate canonical Neon hostname and database name
→ create Neon HTTP query client
→ verify database runtime identity
→ create ToolRadar repository
→ claim work and persist captures
```

Every worker binds to all of the following values before accessing runtime data:

- product code `global-tool-radar`;
- provider `neon`;
- Neon project ID;
- Neon branch ID;
- database name;
- installation UUID;
- schema version.

A missing or mismatched binding fails closed.

## Database ownership

The three ordered migrations under `neon/migrations` own:

1. eight bounded runtime tables and their indexes;
2. append-only guards and dedicated-database initialization;
3. atomic source capture, channel leases, ingestion completion, and snapshot projection.

Runtime initialization scans the `public` schema. Any non-ToolRadar business object blocks
initialization, so this installation cannot silently share another product database.

## Correctness rules

- Source revisions and metric snapshots are append-only.
- A duplicate content hash does not create a fake revision.
- A duplicate timestamp does not create a fake metric snapshot.
- Metrics at a new timestamp can be added without creating another content revision.
- Channel claims use `FOR UPDATE SKIP LOCKED` and a time-bounded lease.
- Only the lease owner can complete or fail an ingestion run.
- Success or failure updates the run and releases the lease in one database function.
- Composite-returning completion functions are called from `FROM`, never expanded as
  `(function()).*`, preventing accidental repeated execution.

## Driver

Workers use `@neondatabase/serverless` over HTTP with manually parameterized queries. The
connection string is server-only. Error wrappers redact PostgreSQL URLs and Neon passwords.

## Bootstrap

1. Apply the three Neon migrations in filename order to an empty dedicated database.
2. Generate one installation UUID.
3. Configure the variables in `.env.example`.
4. Temporarily set:

```text
TOOLRADAR_RUNTIME_INITIALIZE_CONFIRMATION=INITIALIZE_DEDICATED_TOOLRADAR_NEON_DATABASE
```

5. Run `npm run runtime:initialize` once.
6. Remove the confirmation variable.
7. Run `npm run runtime:verify`.
8. Seed explicit YouTube channel IDs and schedule `npm run worker:youtube`.

No browser authentication, content generation, media download, payment, or publishing is
introduced by this runtime.
