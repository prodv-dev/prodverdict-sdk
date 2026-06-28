---
name: prodverdict-setup
description: >-
  Bootstrap ProdVerdict in a SaaS repo — prodverdict.yml, scheduled drift workflow,
  Cursor MCP, and agent rule. Use when the user asks to set up ProdVerdict, install
  prodverdict, add billing drift detection, or wire Stripe/Postgres production checks.
---

# ProdVerdict setup

Deterministic production contract checks for AI-assisted SaaS. No LLM in the evaluation path.

## When to use

User wants ProdVerdict installed, billing drift detection, or Stripe vs database access sync.

## Bootstrap flow (run in order)

1. Scan the repo:

```bash
npx prodverdict scan --format agent
```

2. Non-interactive bootstrap (writes config, workflow, MCP, rule, skills):

```bash
npx prodverdict setup --yes --format agent --from-env
```

If local MCP is configured, call tool **`bootstrap_prodverdict`** instead (same result).

3. Parse the JSON output:
   - If `missing` lists credentials, guide the user — **never invent API keys**
   - **STRIPE_SECRET_KEY:** https://dashboard.stripe.com/apikeys — restricted key, Customers + Subscriptions read
   - **DATABASE_URL:** read-only Postgres role — `postgresql://prodverdict_readonly:...@host/db`
   - **GitHub secrets** (for scheduled workflow): `gh secret set STRIPE_SECRET_KEY`, `DATABASE_URL`, `SLACK_WEBHOOK_URL`
   - Re-run bootstrap after the user exports vars

4. Verify:

```bash
npx prodverdict status --format agent
```

5. Customize `prodverdict.yml` — replace placeholder price IDs (`price_your_*`) with real IDs from the repo.

## Rules

- **Fail closed:** missing credentials must fail checks, never pass silently
- **No secrets in git:** never commit `.env.local`, API keys, or database URLs
- **Merge blocking is CI:** local MCP verifies; GitHub Actions enforces on schedule/PR

## Docs

https://prodverdict.com/docs/agents/ai-setup
