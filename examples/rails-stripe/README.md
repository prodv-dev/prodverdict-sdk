# Rails + Stripe example

Golden-path example for a Rails SaaS with Stripe Billing and a Postgres `users` table (ActiveRecord defaults).

## Quick demo (no Stripe or database)

From the [prodverdict-sdk](https://github.com/prodv-dev/prodverdict-sdk) repo root (or this monorepo's `core/`):

```bash
npx prodverdict check access \
  --config examples/rails-stripe/prodverdict.yml \
  --fixtures \
  --fixtures-dir examples/rails-stripe/scenarios/pass
```

Revenue-leak scenario:

```bash
npx prodverdict check access \
  --config examples/rails-stripe/prodverdict.yml \
  --fixtures \
  --fixtures-dir examples/rails-stripe/scenarios/fail-revenue-leak
```

Or run both:

```bash
node examples/rails-stripe/run-demo.mjs
```

## Use in your Rails app

1. Copy `prodverdict.yml` to your repo root.
2. Update `plans:` with your Stripe price IDs.
3. If your model uses `accounts` instead of `users`, set `database.users_table: accounts`.

### Typical User model columns

| Column | Purpose |
|--------|---------|
| `id` | bigint primary key |
| `stripe_customer_id` | Stripe customer ID |
| `has_paid_access` | boolean gate for paid features |
| `plan` | string plan slug |

### Live check

```bash
export STRIPE_SECRET_KEY=sk_test_...
export DATABASE_URL=postgresql://...

npx prodverdict check access --config prodverdict.yml
```

Use the same `DATABASE_URL` as production/staging (read-only Postgres user recommended for CI).

### Stripe webhook controller

In `app/controllers/webhooks/stripe_controller.rb`, handle subscription lifecycle events:

```ruby
# customer.subscription.updated
user = User.find_by!(stripe_customer_id: subscription.customer)
user.update!(has_paid_access: subscription.active?, plan: plan_from_price(subscription))

# customer.subscription.deleted
user.update!(has_paid_access: false, plan: nil)
```

ProdVerdict flags rows where Stripe says active but `has_paid_access` is still false.

### GitHub Actions

```yaml
name: ProdVerdict

on:
  pull_request:

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

## See also

- [nextjs-stripe/](../nextjs-stripe/) — Next.js + Postgres
- [supabase-stripe/](../supabase-stripe/) — Supabase `profiles` table
- [prodverdict.com](https://prodverdict.com)
