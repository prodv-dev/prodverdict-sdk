# Next.js + Stripe example

Golden-path example for a typical indie SaaS: Next.js app, Stripe subscriptions, Postgres `users` table.

Try ProdVerdict **without credentials** using bundled fixture scenarios, then wire it to your real stack.

## Quick demo (no Stripe or database)

From the [prodverdict-sdk](https://github.com/prodv-dev/prodverdict-sdk) repo root (or this monorepo's `core/`):

```bash
npx prodverdict check access \
  --config examples/nextjs-stripe/prodverdict.yml \
  --fixtures \
  --fixtures-dir examples/nextjs-stripe/scenarios/pass
```

Expected: **pass** (Stripe and DB are in sync).

Revenue-leak scenario (active subscription, `has_paid_access` still false):

```bash
npx prodverdict check access \
  --config examples/nextjs-stripe/prodverdict.yml \
  --fixtures \
  --fixtures-dir examples/nextjs-stripe/scenarios/fail-revenue-leak
```

Expected: **fail** with a high-severity finding on `usr_alice`.

Or run both:

```bash
node examples/nextjs-stripe/run-demo.mjs
```

## Use in your app

1. Copy `prodverdict.yml` to your repo root.
2. Update the `plans` map with your real Stripe price IDs (`price_...` → `starter` / `pro` / etc.).
3. Ensure your `users` table has `stripe_customer_id`, `has_paid_access`, and `plan` (or adjust `columns` in the YAML).

### Local check (test mode)

```bash
export STRIPE_SECRET_KEY=sk_test_...
export DATABASE_URL=postgresql://...

npx prodverdict check access --config prodverdict.yml
```

### GitHub Actions

```yaml
name: ProdVerdict

on:
  pull_request:
  schedule:
    - cron: '0 9 * * 1'  # weekly Monday 09:00 UTC

jobs:
  access-contract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: prodv-dev/prodverdict-sdk/packages/action@v0.1.0
        with:
          config: ./prodverdict.yml
          contract: access
        env:
          STRIPE_SECRET_KEY: ${{ secrets.STRIPE_TEST_KEY }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Typical Next.js + Stripe schema

This example assumes:

| Column | Purpose |
|--------|---------|
| `users.id` | App user ID |
| `users.stripe_customer_id` | Stripe customer ID |
| `users.has_paid_access` | Boolean gate for paid features |
| `users.plan` | Plan slug (`starter`, `pro`, …) |

Webhook handlers should keep `has_paid_access` and `plan` in sync with Stripe subscription events.

## Stripe restricted key

Create a restricted key at https://dashboard.stripe.com/apikeys with **Read** on `customers` and `subscriptions` only.

## See also

- [test-env/README.md](../../test-env/README.md) — Docker Postgres + more scenarios
- [access-check/](../access-check/) — minimal credentials-only guide
