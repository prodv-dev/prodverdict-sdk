# ProdVerdict: Stripe says paid. Your app might disagree.

User paid. Stripe looked fine. The app still gated them.

A webhook fired. The handler was supposed to flip `has_paid_access` to true. It didn't — the developer was iterating on checkout, mocked Stripe in tests, and shipped without re-testing the live webhook path. Or the agent "fixed" the cancel handler and skipped `invoice.payment_failed`. Or a duplicate event re-arrived and the idempotency key wasn't checked. The bug lives where billing and your database disagree — and nothing in your test suite checks that intersection.

**ProdVerdict** checks that intersection. It compares live billing state (Stripe or Paddle) against who your app database thinks has paid access. Rules only — no LLM in the evaluation path. Missing credentials = fail, not a silent pass.

```bash
npx prodverdict demo
```

One command. No git clone. No API keys. You see a revenue-leak FAIL in under five seconds.

## The problem

Billing drift happens. Webhook handlers get mocked in tests and skip edge cases in production. `payment_failed`, `subscription.deleted`, duplicate events, and race conditions between checkout and fulfillment silently break access state. The result is one of two expensive outcomes:

- **Revenue leak:** customer paid, app says free. They cannot use what they bought. They churn, complain, or charge back.
- **Wrongful access:** customer cancelled, app still says paid. You give away the product.

These bugs are not specific to AI-generated code. They have existed since webhooks were a thing. What changed is velocity: more code shipped faster means more drift introduced faster. The check that catches it is the same check that always should have existed — compare the source of truth against your app state, on a schedule, and alert on disagreement.

## What ProdVerdict checks

ProdVerdict defines **production contracts** — declarative rules about application state that must always be true:

| Contract | What it catches |
| -------- | --------------- |
| **Access** | Stripe/Paddle subscription state vs app `has_paid_access` — revenue leaks, wrongful access, plan drift |
| **Config** | `process.env` references missing from `.env.example` or CI secrets |
| **Migration** | Unsafe Postgres DDL that locks hot tables |
| **Boundary** | Mass-assignment and forbidden sensitive fields in API handlers |
| **Webhook** | Missing signature verification or idempotency in webhook handlers |
| **Restore** | Backup/restore smoke tests in CI |

**Lead with Access.** It ties directly to revenue and proves the concept in one command. The other contracts are bundled OSS linters — useful, free, but not the product.

## How it works

1. **Try the demo:** `npx prodverdict demo` — bundled fixture, expect FAIL (active sub, `has_paid_access` false).
2. **Scan your repo:** `npx prodverdict scan` — detects Stripe/Paddle, env vars, migrations; recommends contracts.
3. **Init:** `npx prodverdict init --mcp --cursor-rule` — writes `prodverdict.yml`, Cursor MCP, agent rule.
4. **Schedule drift detection:** copy `prodverdict scheduled` output into `.github/workflows/`, set `STRIPE_SECRET_KEY` and `DATABASE_URL` as repo secrets, get Slack alerts on drift.
5. **Lint before merge:** add the same Action on PRs for config, migration, boundary, and webhook contracts.

ProdVerdict does **not** generate code or call an LLM. It is a deterministic evaluator — pass, warn, or fail with concrete fix instructions.

## Why this matters

- **Protect revenue:** premium features given away free, or paying customers locked out, when billing and DB drift apart.
- **Catch drift before customers do:** scheduled checks surface disagreement in minutes, not after a support ticket.
- **Prevent downtime:** unsafe migrations lock live Postgres tables before deploy.
- **Eliminate config drift:** missing env vars surface in CI, not after deployment.
- **Secure APIs:** mass-assignment bugs caught before merge.

## Migrating to Stripe Entitlements

If you are migrating from local DB flags to Stripe Entitlements (Stripe as the source of truth for feature access), ProdVerdict verifies the migration is complete. The `entitlements-migration` contract flags users your DB says are paid but Stripe doesn't know about — and vice versa. See [entitlements-migration-guide.md](entitlements-migration-guide.md).

## Next steps

- [Getting started](getting-started.md) — 5-minute path for Next.js + Stripe
- [Scheduled vs PR](scheduled-vs-pr.md) — which cadence for which contract
- [Phase 1 — Access Contract](phase-1-design.md)
- [Implementation guide](implementation-guide.md)
