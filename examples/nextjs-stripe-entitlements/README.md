# Next.js + Stripe Entitlements

Example `prodverdict.yml` for a Next.js SaaS that has migrated (or is migrating) from local DB `has_paid_access` flags to Stripe Entitlements as the source of truth for feature access.

## Files

- [`prodverdict.yml`](prodverdict.yml) — both `entitlements-migration` and `access` (with `source_of_truth: stripe_entitlements`) contracts

## Setup

1. **Define Entitlements products and features in Stripe.** Set `lookup_key` on each feature to match your plan slug (e.g., `pro`, `starter`).
2. **Create a restricted Stripe key** with `entitlements.read` + `customers: Read`.
3. **Create a read-only Postgres role** for ProdVerdict.
4. **Set env vars** in CI:
   - `STRIPE_SECRET_KEY`
   - `DATABASE_URL`

## During migration

Run the `entitlements-migration` contract to find users your DB says are paid but Stripe doesn't know about:

```bash
npx prodverdict check entitlements-migration --config prodverdict.yml
```

Iterate until it passes. See [entitlements-migration-guide.md](../../../docs/entitlements-migration-guide.md) for the full playbook.

## After migration

Remove the `entitlements-migration` contract from `prodverdict.yml`. Keep the `access` contract running on a schedule:

```bash
npx prodverdict scheduled --frequency hourly
```

Copy the output to `.github/workflows/prodverdict-access.yml`.

## See also

- [Phase 6 — Entitlements Design](../../../docs/phase-6-entitlements-design.md)
- [Entitlements Migration Guide](../../../docs/entitlements-migration-guide.md)
- [Scheduled vs PR](../../../docs/scheduled-vs-pr.md)
