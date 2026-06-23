# ProdVerdict: Stripe says paid. Your app might disagree.

User paid. Stripe looked fine. The app still gated them.

CI passed because tests mock Stripe. The webhook handler never updated `has_paid_access`. Or the agent "fixed" checkout and skipped `invoice.payment_failed`. The bug lives where billing and your database disagree — and nothing in your test suite checks that intersection.

**ProdVerdict** checks that intersection. It compares live billing state (Stripe or Paddle) against who your app database thinks has paid access. Rules only — no LLM in the evaluation path. Missing credentials = fail, not a silent pass.

```bash
npx prodverdict demo
```

One command. No git clone. No API keys. You see a revenue-leak FAIL in under five seconds.

## The problem

AI coding tools ship billing logic fast. Tests pass because Stripe is mocked. Webhook edge cases (`payment_failed`, `subscription.deleted`, duplicate events) silently break. Human reviewers miss it — PR volume is up 98% and diff size up 154% since AI adoption scaled.

Developers don't trust AI output (only 33% trust AI accuracy; 46% actively distrust it), but they have no automatic gate on **production invariants** — the rules that must always hold regardless of how the code was written.

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

**Lead with Access.** It ties directly to revenue and proves the concept in one command. The other contracts are expansion once teams trust the first check.

## How it works

1. **Try the demo:** `npx prodverdict demo` — bundled fixture, expect FAIL (active sub, `has_paid_access` false).
2. **Scan your repo:** `npx prodverdict scan` — detects Stripe/Paddle, env vars, migrations; recommends contracts.
3. **Init:** `npx prodverdict init --mcp --cursor-rule` — writes `prodverdict.yml`, Cursor MCP, agent rule.
4. **Run checks:** `npx prodverdict check access` locally or in GitHub Actions on every PR.
5. **Agents adapt:** Local MCP exposes the same checks so Cursor verifies billing changes before opening a PR.

ProdVerdict does **not** generate code or call an LLM. It is a deterministic evaluator — pass, warn, or fail with concrete fix instructions.

## Why this matters

- **Protect revenue:** Premium features given away free, or paying customers locked out, when billing and DB drift apart.
- **Prevent downtime:** Unsafe migrations lock live Postgres tables before deploy.
- **Eliminate config drift:** Missing env vars surface in CI, not after deployment.
- **Secure APIs:** Mass-assignment bugs caught before merge.

## Context: AI adoption vs trust

- ~84–90% of developers use or plan to use AI coding assistants (Stack Overflow 2025).
- ~45% of AI-generated code samples contain OWASP Top 10 vulnerabilities (Veracode).
- AI-assisted developers generate security findings at ~10× the rate of peers (Cloud Security Alliance).
- Only 33% of developers trust AI accuracy; 46% actively distrust it.

ProdVerdict fills the gap between AI velocity and production guarantees — not by reviewing code, but by enforcing contracts about **effects** of that code.

## Next steps

- [Getting started](getting-started.md) — 5-minute path for Next.js + Stripe
- [Phase 1 — Access Contract](phase-1-design.md)
- [Implementation guide](implementation-guide.md)
