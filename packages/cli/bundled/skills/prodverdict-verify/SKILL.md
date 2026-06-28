---
name: prodverdict-verify
description: >-
  Run ProdVerdict production contract checks before opening a PR. Use when the user
  asks to verify before PR, run prodverdict checks, validate billing access, or check
  production contracts (access, config, migration).
---

# ProdVerdict verify before PR

Deterministic checks — no LLM in the evaluation path. Billing secrets stay on the user's machine.

## When to use

Before opening a PR that touches billing, env vars, migrations, or access control.

## Verify loop

1. Diagnose config and credentials:

```bash
npx prodverdict doctor --format agent
```

2. Run all configured contracts:

```bash
npx prodverdict check all --format agent
```

3. If findings exist:
   - Apply `fix` hints from the agent JSON output
   - Call MCP **`suggest_fix`** with the findings array (deterministic hints only)
   - Re-run until `verdict` is `pass`

## MCP tools (if configured)

- `doctor` — config and env diagnostics
- `check_all_contracts` — access, config, migration, and others in config
- `check_access_contract` / `check_config_contract` / `check_migration_contract`
- `suggest_fix` — extract fix hints from findings

## Rules

- **Fail closed:** do not skip checks when credentials are missing
- **No secrets in git**
- Access contract compares live Stripe/Paddle vs app DB — run locally only

## Docs

https://prodverdict.com/docs/agents/ai-setup
