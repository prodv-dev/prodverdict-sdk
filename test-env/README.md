# ProdVerdict Test Environment

Local Postgres + Stripe fixture JSON to exercise ProdVerdict without a real Stripe account.

Uses **`--fixtures-stripe`**: live database reads + deterministic Stripe subscription data from JSON.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) running
- Node.js 20+ with `core/` built (`npm run build` from `core/`)

## Quick start

```bash
cd core/test-env

# Start Postgres
node run.mjs up

# Run one scenario (seeds DB + runs check)
node run.mjs check pass
node run.mjs check fail-revenue-leak

# Run all scenarios
node run.mjs all

# Stop and clean up
node run.mjs down
```

From `core/`:

```bash
npm run test:env
```

## Scenarios

| Scenario | DB state | Stripe fixture | Expected verdict |
|----------|----------|----------------|------------------|
| `pass` | Alice paid, Bob free | Active + canceled subs aligned | **pass** |
| `fail-revenue-leak` | Alice marked free | Alice has active sub | **fail** (high) |
| `fail-wrongful-access` | Bob still has access | Bob sub canceled | **fail** (high) |
| `fail-plan-drift` | Alice on `starter` plan | Alice sub on `price_pro` | **fail** (high) |

## Layout

```
test-env/
├── docker-compose.yml      # Postgres on localhost:5433
├── prodverdict.yml         # Config for this environment
├── sql/
│   ├── 001_schema.sql      # users table (auto on first start)
│   └── seed-*.sql          # Per-scenario DB seeds
├── scenarios/
│   └── <name>/stripe/subscriptions.json
└── run.mjs                 # Helper CLI
```

## Manual CLI

```bash
export DATABASE_URL=postgresql://prodverdict:prodverdict@localhost:5433/prodverdict_test

# After seeding with sql/seed-pass.sql
node ../packages/cli/dist/index.js check access \
  --config prodverdict.yml \
  --fixtures-stripe scenarios/pass \
  --format text
```

## Connection details

| Setting | Value |
|---------|-------|
| Host | `localhost:5433` |
| Database | `prodverdict_test` |
| User / Password | `prodverdict` / `prodverdict` |

## Troubleshooting

**Docker not running** — start Docker Desktop, then `node run.mjs up`.

**Port 5433 in use** — change the host port in `docker-compose.yml`.

**Schema missing** — run `node run.mjs down` then `node run.mjs up` to re-init (wipes data).
