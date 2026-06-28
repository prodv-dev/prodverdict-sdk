# ProdVerdict

**Your CI is green. Your billing logic might still be broken.**

ProdVerdict checks if Stripe (or Paddle) and your app database agree on who paid. Deterministic rules — no LLM in the evaluation path. Missing credentials = fail, not a silent pass.

**Website:** [prodverdict.com](https://prodverdict.com)

[![npm](https://img.shields.io/npm/v/prodverdict.svg)](https://www.npmjs.com/package/prodverdict)
[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-ProdVerdict-007ec6.svg)](https://github.com/marketplace/actions/prodverdict)
[![CI](https://github.com/prodv-dev/prodverdict-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/prodv-dev/prodverdict-sdk/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 5-minute quickstart

**No credentials required** — one command:

```bash
npx prodverdict demo
```

You should see a **FAIL** verdict: user has an active Stripe subscription but `has_paid_access` is false (revenue leak).

### Set up scheduled drift detection (recommended first install)

Access is a scheduled check, not a PR gate — billing drift only exists after the webhook fires in production. Generate the workflow:

```bash
npx prodverdict scheduled --frequency hourly
```

Copy the output to `.github/workflows/prodverdict-access.yml`, then set these repo secrets:

- `STRIPE_SECRET_KEY` — restricted key, `customers: Read` + `subscriptions: Read`
- `DATABASE_URL` — read-only Postgres connection string
- `SLACK_WEBHOOK_URL` — for fail alerts

You now get hourly drift detection with Slack alerts. See [scheduled-vs-pr.md](../docs/scheduled-vs-pr.md) for why Access is scheduled and the other contracts are PR gates.

### Scan your repo and init

```bash
npx prodverdict scan
npx prodverdict init --mcp --cursor-rule
```

### Fixture demo (from SDK clone)

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

- uses: prodv-dev/prodverdict-action@v0.11.0
  with:
    config: ./prodverdict.yml
    contract: access   # access | config | migration | boundary | webhook | restore | entitlements-migration | all
    strict: false
  env:
    STRIPE_SECRET_KEY: ${{ secrets.STRIPE_TEST_KEY }}
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Paddle + Postgres:** use `examples/paddle-stripe/prodverdict.yml` and set `PADDLE_API_KEY` instead of Stripe.

Monorepo path (also works): `prodv-dev/prodverdict-sdk/packages/action@v0.9.0`

The action runs against **your repository** (not the SDK checkout), posts findings as a PR comment, and fails on high-severity access violations.

Install from [GitHub Marketplace](https://github.com/marketplace/actions/prodverdict) or reference the tag directly as shown above.

## Remote MCP (v0.8)

Hosted at [prodverdict.com/api/mcp](https://prodverdict.com/api/mcp) for config/migration checks without local billing credentials. GitHub App reads repo files only — no Stripe/DB secrets on ProdVerdict cloud.

```bash
npx prodverdict init --remote-mcp --project-id your-project-uuid
# or: npx prodverdict remote-mcp --print --project-id ... --api-key pv_...
```

```json
{
  "mcpServers": {
    "prodverdict-remote": {
      "url": "https://prodverdict.com/api/mcp",
      "headers": {
        "Authorization": "Bearer pv_...",
        "X-Prodverdict-Project-Id": "your-project-uuid"
      }
    }
  }
}
```

Tools: `check_repo_contracts` (config + migration + boundary + webhook when configured, Pro), `check_config_contract`, `check_migration_contract`, `suggest_fix`, `get_recent_runs` (Pro). Prompts and schema resources included. Access contract stays on **local MCP** only. See [docs/mcp-design.md](../docs/mcp-design.md) and [prodverdict.com/agents](https://prodverdict.com/agents).

## Agent workflow (v0.6+)

For Cursor, Claude Code, and other coding agents:

```bash
# Scaffold config + Cursor MCP + agent rule
npx prodverdict init --stack nextjs-stripe --mcp --cursor-rule

# Remote MCP (config/migration via GitHub — copy from dashboard)
npx prodverdict init --remote-mcp --project-id your-project-uuid

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

Tools: `doctor`, `check_all_contracts`, `check_access_contract`, `check_config_contract`, `check_migration_contract`, `check_boundary_contract`, `check_webhook_contract`, `check_restore_contract`, `validate_config`, `suggest_fix`.

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
| [supabase-paddle](examples/supabase-paddle/) | Supabase + Paddle | `profiles` |
| [paddle-stripe](examples/paddle-stripe/) | Paddle Billing + Postgres | `users` (`paddle_customer_id`) |
| [rails-stripe](examples/rails-stripe/) | Rails + Stripe | `users` |
| `neon-stripe` / `clerk-stripe` | Init templates (reuse `nextjs-stripe` fixtures) | `users` |

`npx prodverdict init --list-stacks` prints all seven templates.

Each example with scenarios includes `pass` / `fail-revenue-leak` demos: `node examples/<name>/run-demo.mjs`.

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

## v0.12.0 — Easy UX + go-to-market assets

**The big change:** the gap between "demo" and "running on real data" is now ~5 minutes. No docs required.

**New CLI commands:**

- `npx prodverdict setup` — interactive first-run wizard. Detects stack, prints Stripe restricted-key helper, prints Postgres read-only role SQL, writes `prodverdict.yml`, runs doctor + first check, writes the GitHub Actions workflow, writes Cursor MCP config. One command, ~5 minutes.
- `npx prodverdict status` — one-glance health check. Shows what's configured (config, env vars, scheduled workflow, MCP) and what to do next.
- `npx prodverdict scheduled --install` — writes the workflow file directly to `.github/workflows/` instead of printing to stdout.

**Improved onboarding flow:**

- `npx prodverdict demo` now ends with `npx prodverdict setup` as the next step (instead of telling you to read 4 docs).
- `npx prodverdict scan` pre-fills the next init command with the detected stack and points to `setup` as the interactive path.

**Go-to-market assets (in `docs/go-to-market/`):**

- Track 1: founder-led outreach DM template + tracker (0 → 5 users)
- Track 2: the "5 SaaS revenue leak study" template + `prodverdict.com/study` page (5 → 10 users)
- Track 3: starter-kit partnership pitch template (10 → 100 users)

**New landing page:** [prodverdict.com/study](https://prodverdict.com/study) — the public study page where redacted concierge findings will publish.

```bash
# The whole onboarding in one command:
npx prodverdict setup

# Then check your state any time:
npx prodverdict status
```

See [docs/go-to-market/README.md](../docs/go-to-market/README.md) for the 0 → 100 users plan.

## v0.11.0 — Stripe Entitlements migration wedge + scheduled-first positioning

**The big change:** ProdVerdict now verifies migrations to Stripe Entitlements. Two new capabilities:

1. **`entitlements-migration` contract** — catches users paid in DB but not granted in Stripe, stale grants, duplicates, and missing `stripe_customer_id`. Run it during migration; iterate until it passes.
2. **Access contract with `source_of_truth: stripe_entitlements`** — verifies the steady state after migration. Compares active Entitlements grants against your DB on a schedule.

**Positioning pivot:**

- Access is now marketed as a **scheduled drift monitor**, not a PR gate. Billing drift only exists after the webhook fires in production — running Access on a PR is the wrong cadence.
- New `prodverdict scheduled` subcommand prints the recommended GitHub Actions workflow for hourly/daily drift detection with Slack on fail.
- Homepage now leads 100% with the Access wedge. The other 5 contracts are bundled OSS linters, not the product.
- Pricing docs reconciled with the live 2-tier site (Free + Pro Cloud $39/project/mo).
- AI-trust statistics removed from the pitch — ProdVerdict verifies production state, not AI-generated code.

```bash
# Generate a scheduled drift workflow
npx prodverdict scheduled --frequency hourly

# Verify a Stripe Entitlements migration
npx prodverdict check entitlements-migration --config prodverdict.yml

# Access with Entitlements source (steady state)
npx prodverdict check access --config prodverdict.yml
```

See [Phase 6 design](../docs/phase-6-entitlements-design.md), [migration guide](../docs/entitlements-migration-guide.md), and [scheduled vs PR](../docs/scheduled-vs-pr.md).

## v0.10.0 — zero-friction discovery

- `npx prodverdict demo` — revenue-leak fixture, no git clone
- `npx prodverdict scan` — static repo analysis, contract recommendations
- `init` auto-detects stack from `package.json`
- Story-first docs and homepage focused on billing reconciliation

## v0.9 — unified engine + full contract suite

- `runContracts()` — single dispatcher in `@prodverdict/engine` (CLI, Action, MCP)
- **Boundary contract** — mass-assignment / sensitive field static scan
- **Webhook contract** — signature verification + idempotency lint
- **Restore contract** — backup/restore smoke commands in CI
- Action: `contract: all` and new contract types
- Dashboard: policy templates API, audit log

```bash
npx prodverdict check boundary
npx prodverdict check webhook
npx prodverdict check restore
npx prodverdict check all --format agent
```

See [docs/phase-4-design.md](../docs/phase-4-design.md), [phase-5a-webhook-design.md](../docs/phase-5a-webhook-design.md), [phase-5b-restore-design.md](../docs/phase-5b-restore-design.md).

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

## v0.7 — remote MCP

- `https://prodverdict.com/api/mcp` — Streamable HTTP remote server
- GitHub-only repo reads for config + migration contracts (Pro)
- `get_recent_runs` via dashboard API key (Pro)
- `parseConfigYaml` in engine; `createRemoteMcpServer` in `@prodverdict/mcp`

## v0.6 — agent tooling

- `prodverdict doctor` — fast credential/config diagnostics
- `--format agent` — stable JSON for AI agents
- `init --mcp --cursor-rule` — Cursor setup in one command
- Local MCP: `doctor`, `check_all_contracts`, fixture mode, prompts, resources

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
