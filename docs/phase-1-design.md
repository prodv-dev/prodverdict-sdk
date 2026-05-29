# Phase 1 Design — Access Contract

Canonical implementation spec for Phase 1. Expands `phases.md` with implementable detail.

## Overview

The Access Contract compares every Stripe subscription against the app's user table and reports mismatches as deterministic findings. It runs in the customer's environment (CLI, CI, or MCP) and never stores customer data in the cloud.

## `prodverdict.yml` Schema

```yaml
version: 1                            # required, only "1" is valid
contracts:
  - type: access                      # required
    source_of_truth: stripe           # default: stripe
    database:
      url_env: DATABASE_URL           # name of env var (not the secret itself)
      users_table: users              # default: users
      columns:
        id: id                        # default: id
        stripe_customer_id: stripe_customer_id
        has_paid_access: has_paid_access
        plan: plan
    stripe:
      secret_env: STRIPE_SECRET_KEY   # name of env var holding a restricted key
    plans:                            # optional — price_id -> plan slug mapping
      price_1ABCxxxPro: pro
      price_1ABCxxxStarter: starter
    severity: high                    # high | medium | low — default: high
    fix: "Hint for agents and humans" # optional default fix instruction
```

**Fail-closed:** if `url_env` or `secret_env` are missing from the process environment, the check exits with code `2` rather than skipping or passing.

## Evaluator Rules

All checks are deterministic. No LLM is used.

| # | Condition | Severity | Entity pattern | Message summary |
|---|-----------|----------|----------------|-----------------|
| 1 | `stripe.status in [active, trialing]` AND `has_paid_access = false` | high | `user:ID` | Revenue leak |
| 2 | `stripe.status in [canceled, unpaid, past_due, incomplete_expired]` AND `has_paid_access = true` | high | `user:ID` | Wrongful access |
| 3 | Same `stripe_customer_id` on 2+ app users | medium | `customer:ID` | Duplicate mapping |
| 4 | Active subscription price ID not in `plans` map | high | `price:ID` | Unknown price |
| 5 | App `plan` != `plans[priceId]` for active subscription | high | `user:ID` | Plan drift |
| 6 | User has `stripe_customer_id` but no Stripe subscription found | medium | `user:ID` | Orphan reference |
| 7 | Stripe customer has active sub but no app user row | low | `customer:ID` | Unlinked subscription |

Rule 4 and 5 only run if `plans` is defined in `prodverdict.yml`.

## Finding Shape

Every finding includes:

```typescript
{
  contract: 'access',
  severity: 'high' | 'medium' | 'low',
  entity: string,      // e.g. "user:u123", "customer:cus_abc", "price:price_pro"
  message: string,     // human-readable
  fix?: string         // agent-readable remediation
}
```

## Verdict Logic

| Findings | Verdict | CLI exit code |
|----------|---------|---------------|
| Any `high` | `fail` | `1` |
| Only `medium` / `low` | `warn` | `0` |
| None | `pass` | `0` |

Config / connector errors exit with code `2` regardless of findings.

## CLI

```bash
# Run access contract with default config
npx prodverdict check access

# With custom config path
npx prodverdict check access --config ./path/to/prodverdict.yml

# Machine-readable output for piping / MCP
npx prodverdict check access --format json

# Validate config file without running live checks
npx prodverdict validate

# Use fixture JSON from fixtures/stripe/ and fixtures/db/
npx prodverdict check access --fixtures

# Exit 1 on warn (medium/low only)
npx prodverdict check access --strict
```

### JSON output shape

```json
{
  "contract": "access",
  "verdict": "fail",
  "findings": [
    {
      "contract": "access",
      "severity": "high",
      "entity": "user:u_abc",
      "message": "User has an active/trialing Stripe subscription...",
      "fix": "Set has_paid_access=true on subscription activation."
    }
  ],
  "evaluatedAt": "2026-05-29T12:00:00.000Z"
}
```

## GitHub Action

From your repository root (requires ProdVerdict source in `core/`):

```yaml
- uses: actions/checkout@v4
- uses: ./core/packages/action
  with:
    config: ./prodverdict.yml
    strict: 'false'
  env:
    STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

The composite action installs dependencies, builds, runs the check, and posts a PR comment on pull requests.

**Secrets required:**

- `STRIPE_SECRET_KEY` — restricted key with `customers: Read` + `subscriptions: Read`
- `DATABASE_URL` — read-only connection string to your app database
- `GITHUB_TOKEN` — standard Actions token; needed only for PR comment posting

## MCP Server

Exposes three tools callable by AI coding agents (Cursor, Copilot, Claude):

| Tool | Purpose |
|------|---------|
| `check_access_contract` | Run full access check; returns `CheckResult` JSON |
| `validate_config` | Parse `prodverdict.yml`; returns errors without running live checks |
| `suggest_fix` | Extract deduplicated fix strings from a findings array |

Configure in Cursor (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "prodverdict": {
      "command": "npx",
      "args": ["@prodverdict/mcp"],
      "env": {
        "STRIPE_SECRET_KEY": "rk_live_...",
        "DATABASE_URL": "postgresql://..."
      }
    }
  }
}
```

## Required Stripe Permissions

Create a restricted key at https://dashboard.stripe.com/apikeys:

- `Customers` → Read
- `Subscriptions` → Read

No write permissions should be granted.

## Required Database Setup

```sql
CREATE ROLE prodverdict_readonly LOGIN PASSWORD 'strong_password';
GRANT CONNECT ON DATABASE yourdb TO prodverdict_readonly;
GRANT USAGE ON SCHEMA public TO prodverdict_readonly;
GRANT SELECT ON users TO prodverdict_readonly;
```

## Security Guarantees

- Stripe and database reads happen in the customer's environment (local or CI runner)
- No customer rows, emails, or subscription data are sent to any ProdVerdict cloud service
- Secrets are read from named env vars; their values are never logged
- Missing credentials cause an immediate fail (exit `2`) — no silent pass
- MCP tools are read-only; they never modify code, merge PRs, or write to databases

## Repository Layout

```
core/
  packages/          # engine, cli, action, mcp
  fixtures/          # Test data — stripe/ and db/ JSON
  examples/          # Customer setup guides
docs/                # Product specs (repo root)
```
