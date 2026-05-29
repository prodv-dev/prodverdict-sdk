# Supabase + Stripe example

Golden-path example for Supabase-hosted Postgres with Stripe subscriptions. Uses the common `public.profiles` table pattern (UUID primary keys).

ProdVerdict reads Postgres only — no Supabase Auth or client SDK required for checks.

## Quick demo (no Stripe or database)

From the [prodverdict-sdk](https://github.com/prodv-dev/prodverdict-sdk) repo root (or this monorepo's `core/`):

```bash
npx prodverdict check access \
  --config examples/supabase-stripe/prodverdict.yml \
  --fixtures \
  --fixtures-dir examples/supabase-stripe/scenarios/pass
```

Revenue-leak scenario:

```bash
npx prodverdict check access \
  --config examples/supabase-stripe/prodverdict.yml \
  --fixtures \
  --fixtures-dir examples/supabase-stripe/scenarios/fail-revenue-leak
```

Or run both:

```bash
node examples/supabase-stripe/run-demo.mjs
```

## Use in your Supabase project

1. Copy `prodverdict.yml` to your repo root.
2. Set `database.users_table: profiles` (or your table name).
3. Map your Stripe price IDs under `plans:`.

### Typical `profiles` schema

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | Primary key (matches `auth.users.id` in many starters) |
| `stripe_customer_id` | text | Stripe customer ID |
| `has_paid_access` | boolean | Gate for paid features |
| `plan` | text | Plan slug (`starter`, `pro`, …) |

### Live check

Use a **service role** or direct Postgres connection string with read access to `profiles`. Row Level Security does not apply to the service role.

From Supabase dashboard → **Project Settings → Database**, copy the **Connection string** (URI). Prefer the **Session pooler** (`pooler.supabase.com`) for CI; use **Direct connection** for local one-off checks if pooler limits are an issue.

```bash
export STRIPE_SECRET_KEY=sk_test_...
export DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"

npx prodverdict check access --config prodverdict.yml
```

Also works with Neon, Railway, RDS, or any Postgres — set `DATABASE_URL` accordingly.

### Stripe webhooks

Keep `profiles.has_paid_access` and `profiles.plan` in sync in your webhook handler (Supabase Edge Function, Next.js route, or separate API):

- `customer.subscription.created` / `updated` → set access + plan from price ID
- `customer.subscription.deleted` → revoke access

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
          DATABASE_URL: ${{ secrets.SUPABASE_DATABASE_URL }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Store `SUPABASE_DATABASE_URL` as a GitHub secret (service role or read-only Postgres user).

## See also

- [nextjs-stripe/](../nextjs-stripe/) — Next.js + generic Postgres `users` table
- [rails-stripe/](../rails-stripe/) — Rails ActiveRecord conventions
- [prodverdict.com](https://prodverdict.com)
