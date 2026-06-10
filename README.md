# ProdVerdict

**Deterministic production contract checks for AI-assisted SaaS.**

ProdVerdict runs **deterministic production contracts** in CI: billing vs database access (Stripe or Paddle), env var drift, and unsafe Postgres migrations — no LLM in the evaluation path.

**Website:** [prodverdict.com](https://prodverdict.com)

[![npm](https://img.shields.io/npm/v/prodverdict.svg)](https://www.npmjs.com/package/prodverdict)
[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-ProdVerdict-007ec6.svg)](https://github.com/marketplace/actions/prodverdict)
[![CI](https://github.com/prodv-dev/prodverdict-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/prodv-dev/prodverdict-sdk/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 5-minute quickstart

**No credentials required** — clone the SDK for fixture paths, then run:

```bash
git clone --depth=1 https://github.com/prodv-dev/prodverdict-sdk.git
cd prodverdict-sdk

npx prodverdict check access \
  --config examples/nextjs-stripe/prodverdict.yml \
  --fixtures \
  --fixtures-dir examples/nextjs-stripe/scenarios/fail-revenue-leak
```

**Paddle + Postgres:**

```bash
npx prodverdict check access \
  --config examples/paddle-stripe/prodverdict.yml \
  --fixtures \
  --fixtures-dir examples/paddle-stripe/scenarios/fail-revenue-leak
```

You should see a **FAIL** verdict: user has an active Stripe subscription but `has_paid_access` is false (revenue leak).

Try the passing scenario:

```bash
npx prodverdict check access \
  --config examples/nextjs-stripe/prodverdict.yml \
  --fixtures \
  --fixtures-dir examples/nextjs-stripe/scenarios/pass
```

Or run both demos: `node examples/nextjs-stripe/run-demo.mjs` (from this repo after `npm run build`).

## Install

```bash
npm install -g prodverdict
# or
npx prodverdict check access --fixtures
```

Packages: `prodverdict` (CLI), `@prodverdict/engine`, `@prodverdict/mcp`.

## Add to your project

1. Add `prodverdict.yml` to your repo root ([example](examples/nextjs-stripe/prodverdict.yml)).
2. Map Stripe price IDs → plan slugs under `plans:`.
3. Point `database` at your `users` table (or customize columns).

### Live check

```bash
export STRIPE_SECRET_KEY=sk_test_...
export DATABASE_URL=postgresql://...

npx prodverdict check access --config prodverdict.yml
```

### Config contract (env vars)

Catches vibecoding drift: `process.env` references missing from `.env.example`, unset required secrets in CI.

```bash
npx prodverdict check config --config prodverdict.yml
# or use the full template (access + config):
npx prodverdict check config --config examples/nextjs-stripe/prodverdict.full.yml
```

`npx prodverdict init` writes **access + config** by default. Use `--access-only` to skip the config block.

### Validate YAML only

```bash
npx prodverdict validate --config prodverdict.yml
```

## GitHub Action

**Marketplace repo** (recommended — `action.yml` at repo root):

```yaml
- uses: actions/checkout@v4

- uses: prodv-dev/prodverdict-action@v0.6.0
  with:
    config: ./prodverdict.yml
    contract: access   # access | config | migration
    strict: false
  env:
    STRIPE_SECRET_KEY: ${{ secrets.STRIPE_TEST_KEY }}
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Paddle + Postgres:** use `examples/paddle-stripe/prodverdict.yml` and set `PADDLE_API_KEY` instead of Stripe.

Monorepo path (also works): `prodv-dev/prodverdict-sdk/packages/action@v0.6.0`

The action runs against **your repository** (not the SDK checkout), posts findings as a PR comment, and fails on high-severity access violations.

Install from [GitHub Marketplace](https://github.com/marketplace/actions/prodverdict) or reference the tag directly as shown above.

## Agent workflow (v0.6)

For Cursor, Claude Code, and other coding agents:

```bash
# Scaffold config + Cursor MCP + agent rule
npx prodverdict init --stack nextjs-stripe --mcp --cursor-rule

# Diagnose credentials before full checks
npx prodverdict doctor --format agent

# Run all contracts — stable agent JSON (schemaVersion: "1")
npx prodverdict check all --format agent
```

Agent output includes `summary`, `nextSteps`, and `exitCode` — same shape from MCP check tools.

## MCP (Cursor / Claude Code)

```json
{
  "mcpServers": {
    "prodverdict": {
      "command": "npx",
      "args": ["-y", "@prodverdict/mcp"],
      "env": {
        "DATABASE_URL": "postgresql://readonly:...@host/db",
        "STRIPE_SECRET_KEY": "rk_live_..."
      }
    }
  }
}
```

Tools: `doctor`, `check_all_contracts`, `check_access_contract`, `check_config_contract`, `check_migration_contract`, `validate_config`, `suggest_fix`.

Prompts: `setup_prodverdict`, `verify_before_pr`. See [docs/mcp-design.md](../docs/mcp-design.md).

## What the Access Contract checks

| Check | What it catches |
|-------|-----------------|
| Revenue leak | Active Stripe sub, `has_paid_access = false` |
| Wrongful access | Cancelled/unpaid sub, still has paid access |
| Plan drift | DB `plan` doesn't match Stripe price mapping |
| Duplicate customer | Same `stripe_customer_id` on multiple users |
| Orphan customer | Active Stripe customer with no app user row |

## Stack templates

Copy the example closest to your stack, then adjust `prodverdict.yml` and `plans:` for your Stripe price IDs.

| Example | Stack | Database table |
|---------|-------|----------------|
| [nextjs-stripe](examples/nextjs-stripe/) | Next.js + Stripe | `users` |
| [supabase-stripe](examples/supabase-stripe/) | Supabase + Stripe | `profiles` |
| [paddle-stripe](examples/paddle-stripe/) | Paddle Billing + Postgres | `users` (`paddle_customer_id`) |
| [rails-stripe](examples/rails-stripe/) | Rails + Stripe | `users` |

Each includes fixture scenarios (`pass` / `fail-revenue-leak`) runnable without credentials: `node examples/<name>/run-demo.mjs`.

## Monorepo layout

| Path | Description |
|------|-------------|
| `packages/engine` | Core evaluator |
| `packages/cli` | `prodverdict` CLI |
| `packages/action` | GitHub composite action |
| `packages/mcp` | MCP server |
| `examples/nextjs-stripe` | **Start here** — Next.js + Stripe golden example |
| `examples/supabase-stripe` | Supabase Postgres + Stripe (`profiles` table) |
| `examples/rails-stripe` | Rails + Stripe (`users` table) |
| `test-env/` | Docker Postgres + pass/fail scenario seeds |
| `fixtures/` | Minimal fixture data for unit-style runs |

## v0.2 — dashboard upload & init

```bash
# Scaffold config for your stack
npx prodverdict init --stack nextjs-stripe

# Upload result to prodverdict.com (after creating a project + API key)
export PRODVERDICT_API_URL=https://prodverdict.com
export PRODVERDICT_API_KEY=pv_...
export PRODVERDICT_PROJECT_ID=...
npx prodverdict check access --fixtures --upload
```

## v0.6 — agent tooling

- `prodverdict doctor` — fast credential/config diagnostics
- `--format agent` — stable JSON for AI agents
- `init --mcp --cursor-rule` — Cursor setup in one command
- MCP: `doctor`, `check_all_contracts`, fixture mode, prompts, resources

## v0.5 — migration contract

```bash
npx prodverdict check migration --config examples/nextjs-stripe/prodverdict.migration.yml
npx prodverdict check all   # every contract in prodverdict.yml
```

MCP: `check_migration_contract`. See [docs/phase-3-design.md](../docs/phase-3-design.md).

## v0.4 — config contract + GitHub connect

- `prodverdict init` includes **access + config** contracts by default
- MCP: `check_config_contract`
- Example: [examples/nextjs-stripe/prodverdict.full.yml](examples/nextjs-stripe/prodverdict.full.yml)
- PR config workflow: [examples/workflows/prodverdict-pr-config.yml](examples/workflows/prodverdict-pr-config.yml)
- Dashboard: connect GitHub App to a project (install URL from project setup)

## v0.3 — ops in CI + run history

Checks still run **only in your CI** (Stripe/DB secrets never leave your runner). v0.3 adds scheduled workflows, Slack on fail/warn, and dashboard upload from CLI or Action.

**Nightly + Slack + upload** — copy [examples/workflows/prodverdict-scheduled.yml](examples/workflows/prodverdict-scheduled.yml):

- `prodv-dev/prodverdict-action@v0.5.0`
- `slack_webhook_url` → `secrets.SLACK_WEBHOOK_URL`
- `PRODVERDICT_API_URL`, `PRODVERDICT_API_KEY`, `PRODVERDICT_PROJECT_ID` — uploads on pass **and** fail

PR workflow: same Action version; add `PRODVERDICT_*` env to upload runs to [prodverdict.com](https://prodverdict.com/dashboard).

Supabase setup for the dashboard: see private site docs `SUPABASE_SETUP.md` (not in public SDK).

## Development

```bash
npm install
npm test
npm run build
```

### Test environment (Docker)

```bash
cd test-env
node run.mjs up
node run.mjs all
```

See [test-env/README.md](test-env/README.md).

## Documentation

- [Concept](docs/concept.md)
- [Phase 1 — Access Contract](docs/phase-1-design.md)
- [Implementation guide](docs/implementation-guide.md)

## License

MIT — see [LICENSE](LICENSE).
