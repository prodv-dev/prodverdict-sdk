# Phase 4 — Boundary Contract (shipped v0.9)

Static analysis for mass-assignment and sensitive field exposure in API handlers.

## Goal

Catch AI-generated route handlers that spread `req.body` into ORM updates or return forbidden columns.

## MVP scope (v0.9)

| Rule | Method | Severity |
|------|--------|----------|
| Forbidden writable fields | Regex/AST scan for body spreads and `.update(body)` patterns | high |
| Forbidden response fields | Detect sensitive column names in returns/selects | high |
| Live HTTP probes | Deferred to v1.1 | — |

## `prodverdict.yml`

```yaml
version: 1
contracts:
  - type: boundary
    forbidden_write: [is_admin, plan, stripe_customer_id]
    forbidden_response: [password_hash, reset_token]
    scan_paths: [src/**/*.ts, src/**/*.tsx, app/api/**]
    severity: high
```

## Surfaces

- CLI: `npx prodverdict check boundary`
- Action: `contract: boundary`
- Local MCP: `check_boundary_contract`
- Remote MCP: included in `check_repo_contracts` when configured

## Deferred

- OpenAPI/GraphQL allowlist validation
- Live CI probe requests with extra JSON fields

## Implementation

- `core/packages/engine/src/evaluators/boundary.ts`
- Dispatched via `runContracts()` in `core/packages/engine/src/run.ts`
