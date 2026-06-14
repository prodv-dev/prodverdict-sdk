# Phase 2 — Config Contract (shipped)

Retro-spec for the implemented config contract (v0.4+).

## Goal

Detect environment variable drift: missing vars, placeholder values, and references in code not declared in `.env.example`.

## `prodverdict.yml` schema

```yaml
version: 1
contracts:
  - type: config
    severity: high
    scan_references: true
    env_example_file: .env.example
    check_placeholders: true
    ignore_vars: []
    rules:
      - type: required
        name: DATABASE_URL
      - type: not_default
        name: STRIPE_SECRET_KEY
        forbidden_values: [sk_test_placeholder, changeme]
```

## Rules

| Rule type | Behavior | Default severity |
|-----------|----------|------------------|
| `required` | Env var must be set at check time | high |
| `not_default` | Var must not equal forbidden placeholder values | high |
| `scan_references` | Walk repo for `process.env.*` / `import.meta.env.*`; flag undeclared names vs `.env.example` | high |

## Surfaces

- CLI: `npx prodverdict check config`
- GitHub Action: `contract: config`
- Local MCP: `check_config_contract`
- Remote MCP: `check_config_contract` (Pro + GitHub App)

## Exit codes

Same as access: `0` pass/warn, `1` fail (high), `2` config error.

## Implementation

- Evaluator: `core/packages/engine/src/evaluators/config.ts`
- Schema: `core/packages/engine/src/config/schema.ts`
