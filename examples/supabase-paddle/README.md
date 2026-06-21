# Supabase + Paddle example

`profiles` table on Supabase Postgres with Paddle as billing source of truth.

## Fixture demo (no credentials)

```bash
cd core
npm run build
node examples/supabase-paddle/run-demo.mjs
```

Or from any repo:

```bash
npx prodverdict check access --fixtures \
  --config examples/supabase-paddle/prodverdict.yml \
  --fixtures-dir examples/supabase-paddle/scenarios/fail-revenue-leak
```

## Init scaffold

```bash
npx prodverdict init --stack supabase-paddle
```
