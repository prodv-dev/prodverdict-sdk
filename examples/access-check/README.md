# Example: Access Check

Run the ProdVerdict Access Contract against your own Stripe account and Postgres database.

## Prerequisites

- Node.js 20+
- ProdVerdict built from `core/` (see [core/README.md](../../README.md))
- A **restricted Stripe secret key** (customers + subscriptions read-only)
- A **read-only Postgres connection string**

## Setup

1. Copy `prodverdict.yml` to your app repo root and update the `plans` map with your Stripe price IDs.
2. Export credentials:

```bash
export STRIPE_SECRET_KEY=rk_live_...
export DATABASE_URL=postgresql://readonly_user:password@host:5432/dbname
```

3. Run from `core/`:

```bash
cd core
npm install && npm run build
node packages/cli/dist/index.js check access --config ../examples/access-check/prodverdict.yml
```

Or with fixtures (no credentials):

```bash
node packages/cli/dist/index.js check access --config fixtures/prodverdict.yml --fixtures
```

## GitHub Actions

```yaml
- uses: actions/checkout@v4
- uses: ./core/packages/action
  env:
    STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Stripe permissions

Restricted key at https://dashboard.stripe.com/apikeys:

- `customers` → Read
- `subscriptions` → Read

## Postgres read-only role

```sql
CREATE ROLE prodverdict_readonly LOGIN PASSWORD 'your_password';
GRANT CONNECT ON DATABASE yourdb TO prodverdict_readonly;
GRANT USAGE ON SCHEMA public TO prodverdict_readonly;
GRANT SELECT ON users TO prodverdict_readonly;
```
