# ProdVerdict

**Deterministic production contract checks for AI-assisted SaaS.**

ProdVerdict compares Stripe subscription state to your database access flags, scans env var coverage, and fails CI when invariants break — no LLM in the evaluation path.

**Website:** [prodverdict.com](https://prodverdict.com)

[![npm](https://img.shields.io/npm/v/prodverdict.svg)](https://www.npmjs.com/package/prodverdict)
[![CI](https://github.com/prodv-dev/prodverdict-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/prodv-dev/prodverdict-sdk/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 5-minute quickstart

**No credentials required** — run against fixture data:

```bash
npx prodverdict check access \
  --config examples/nextjs-stripe/prodverdict.yml \
  --fixtures \
  --fixtures-dir examples/nextjs-stripe/scenarios/fail-revenue-leak
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

```bash
npx prodverdict check config --config prodverdict.yml
```

### Validate YAML only

```bash
npx prodverdict validate --config prodverdict.yml
```

## GitHub Action

```yaml
- uses: actions/checkout@v4

- uses: prodv-dev/prodverdict-sdk/packages/action@v0.1.0
  with:
    config: ./prodverdict.yml
    contract: access
    strict: false
  env:
    STRIPE_SECRET_KEY: ${{ secrets.STRIPE_TEST_KEY }}
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

The action runs against **your repository** (not the SDK checkout), posts findings as a PR comment, and fails on high-severity access violations.

Install from [GitHub Marketplace](https://github.com/marketplace/actions/prodverdict) or reference the tag directly as shown above.

## MCP (Cursor / Claude Code)

```json
{
  "mcpServers": {
    "prodverdict": {
      "command": "npx",
      "args": ["-y", "@prodverdict/mcp"]
    }
  }
}
```

Tools: `check_access_contract`, `validate_config`, `suggest_fix`.

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
