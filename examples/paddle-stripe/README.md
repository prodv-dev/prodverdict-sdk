# Paddle + Postgres example

Access contract with `source_of_truth: paddle`. Maps `paddle_customer_id` in your users table via `database.columns`.

## Fixture demo (no credentials)

```bash
npx prodverdict check access \
  --config examples/paddle-stripe/prodverdict.yml \
  --fixtures \
  --fixtures-dir examples/paddle-stripe/scenarios/fail-revenue-leak
```

## Live check

```bash
export PADDLE_API_KEY=your_read_only_key
export PADDLE_ENVIRONMENT=sandbox
export DATABASE_URL=postgresql://...

npx prodverdict check access --config examples/paddle-stripe/prodverdict.yml
```

Use a Paddle API key with **subscription.read** only. See [docs/phase-1-design.md](../../../docs/phase-1-design.md) (Paddle appendix).
