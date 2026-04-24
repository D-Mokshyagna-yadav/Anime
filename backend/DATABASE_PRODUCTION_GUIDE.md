# Database Production Guide

This backend uses Prisma with dynamic provider selection.

## 1) Provider Detection Rules

Provider is selected from `DATABASE_URL` unless `DB_TYPE` override is set.

- `mongodb://` or `mongodb+srv://` -> `mongodb`
- URL containing `supabase.co` -> `postgresql` (Supabase)
- `postgresql://` or `postgres://` -> `postgresql`
- `mysql://` -> `mysql`
- Fallback if unrecognized -> `mongodb`

Optional override:

- `DB_TYPE=mongodb`
- `DB_TYPE=postgresql` (or `postgres`, `supabase`)
- `DB_TYPE=mysql`

## 2) Required Environment Variables

- `DATABASE_URL` (required)
- `DB_TYPE` (optional override)

Do not log or expose `DATABASE_URL`.

## 3) Schema Preparation and Client Generation

Always prepare schema before Prisma operations:

```bash
npm run prisma:prepare
npm run prisma:generate
```

`prisma:prepare` rewrites `prisma/schema.prisma` from templates:

- Mongo template: `prisma/schema.mongo.prisma`
- SQL template: `prisma/schema.sql.prisma`

## 4) Migration Strategy

### MongoDB (primary)

Use schema sync (`db push`), not SQL migrations:

```bash
npm run prisma:db:push
```

### PostgreSQL / Supabase / MySQL

Use migration workflow:

```bash
npm run prisma:migrate
```

For CI/CD, run migration deploy if your pipeline uses generated migration files:

```bash
npx prisma migrate deploy
```

## 5) Startup Behavior

On backend startup:

1. DB provider is detected.
2. Prisma client initializes as singleton.
3. Connection retry with exponential backoff runs.
4. Connected provider is logged (safe label only).
5. Graceful shutdown disconnects Prisma on `SIGINT` / `SIGTERM`.

## 6) Recommended Production Flow

1. Set `DATABASE_URL` (and optional `DB_TYPE`).
2. Run `npm run prisma:prepare`.
3. Run either:
   - Mongo: `npm run prisma:db:push`
   - SQL: `npm run prisma:migrate` or `npx prisma migrate deploy`
4. Run `npm run prisma:generate`.
5. Start server with `npm run start`.
