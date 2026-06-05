# Phase 3 Design — Migration Contract

Canonical implementation spec for Phase 3. Static analysis of SQL migration files — no LLM.

## Overview

The Migration Contract scans migration SQL for Postgres statements that acquire dangerous locks on live tables. It runs in CI against files in the repo (Prisma, Drizzle, or raw SQL globs).

## `prodverdict.yml` Schema

```yaml
version: 1
contracts:
  - type: migration
    paths:
      - prisma/migrations/**/*.sql
      - drizzle/**/*.sql
    severity: high
    fix: "Use CREATE INDEX CONCURRENTLY and multi-step NOT NULL backfills."
```

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `type` | yes | — | `migration` |
| `paths` | yes | — | Glob patterns relative to repo root |
| `severity` | no | `high` | Default severity for unsafe statements |
| `fix` | no | — | Default remediation hint |

## Evaluator Rules (MVP)

| # | Pattern | Severity | Message |
|---|---------|----------|---------|
| 1 | `CREATE INDEX` without `CONCURRENTLY` | high | Blocks writes on large tables |
| 2 | `ALTER TABLE ... ADD COLUMN ... NOT NULL` (no default / one-step) | high | Full table rewrite |
| 3 | `ALTER TABLE ... SET NOT NULL` | high | Constraint validation lock |
| 4 | `DROP TABLE` / `TRUNCATE` | high | Destructive DDL |
| 5 | `VACUUM FULL` | high | Exclusive lock |

Live `pg_table_size` blast-radius scoring is deferred to v0.5.1.

## Verdict

Same as other contracts: any `high` → `fail`, only medium/low → `warn`, none → `pass`.

## CLI

```bash
npx prodverdict check migration
npx prodverdict check migration --repo-root .
```

## Fixtures

See `core/examples/nextjs-stripe/migrations/` — `unsafe/` and `safe/` directories for demo runs with `--fixtures-migration`.
