# Phase 5b — Restore Contract (shipped v0.9)

Backup restore smoke test in CI.

## Goal

Verify `pg_dump` / `pg_restore` works and critical tables contain data after restore.

## MVP scope

```yaml
version: 1
contracts:
  - type: restore
    backup_command: pg_dump $DATABASE_URL -Fc -f /tmp/backup.dump
    restore_command: pg_restore -d $RESTORE_DATABASE_URL /tmp/backup.dump
    smoke_queries:
      - SELECT count(*) > 0 FROM users
      - SELECT count(*) > 0 FROM subscriptions
    command_env:
      DATABASE_URL: DATABASE_URL
      RESTORE_DATABASE_URL: RESTORE_DATABASE_URL
    severity: high
```

## Behavior

1. Fail-closed if `backup_command` or `restore_command` missing
2. Run backup → restore → each smoke query
3. Any command non-zero exit → high finding

## Surfaces

- CLI: `npx prodverdict check restore`
- Action: `contract: restore` (requires Postgres client tools in runner)
- **Not** on remote MCP (needs DB/docker in customer CI)

## Implementation

- `core/packages/engine/src/evaluators/restore.ts`
- Injectable `runCommand` / `runQuery` for unit tests
