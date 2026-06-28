import type { Finding } from '../types.js';
import type { EntitlementsMigrationContractConfig } from '../config/schema.js';
import type {
  EntitlementsReader,
  DatabaseReader,
  AppUser,
  ActiveEntitlement,
} from '../connectors/types.js';

export interface EntitlementsMigrationDataSources {
  database: DatabaseReader;
  entitlements: EntitlementsReader;
}

/**
 * Verifies a migration from local DB has_paid_access flags to Stripe Entitlements.
 *
 * Catches four classes of drift:
 *  1. User paid in DB (has_paid_access=true) but no active entitlement in Stripe (high) —
 *     "user paid but Stripe doesn't know." This is the migration gap.
 *  2. Active entitlement in Stripe but DB has_paid_access=false (medium) —
 *     "Stripe has a grant your DB doesn't reflect." Usually means the migration
 *     script ran but the DB flag wasn't flipped post-grant.
 *  3. Duplicate entitlement grants for the same feature per customer (medium) —
 *     usually a manual-grant + subscription-grant collision.
 *  4. User with has_paid_access=true but no stripe_customer_id (high) —
 *     cannot be migrated without backfill. Blocks the migration.
 */
export async function evaluateEntitlementsMigration(
  cfg: EntitlementsMigrationContractConfig,
  sources: EntitlementsMigrationDataSources,
): Promise<Finding[]> {
  const [entitlements, users] = await Promise.all([
    sources.entitlements.listActiveEntitlements(),
    sources.database.listUsers(),
  ]);

  const findings: Finding[] = [];
  const defaultFix = cfg.fix;
  const severity = cfg.severity;

  const entsByCustomerId = groupEntitlementsByCustomerId(entitlements);

  // Check 3 (run first so it's reported per-customer before per-user checks):
  // duplicate grants for the same feature per customer.
  for (const [customerId, grants] of entsByCustomerId) {
    const seenFeatures = new Set<string>();
    const duplicates: string[] = [];
    for (const g of grants) {
      if (seenFeatures.has(g.feature)) {
        duplicates.push(g.feature);
      } else {
        seenFeatures.add(g.feature);
      }
    }
    if (duplicates.length > 0) {
      findings.push({
        contract: 'entitlements-migration',
        severity: 'medium',
        entity: `customer:${customerId}`,
        message: `Stripe customer "${customerId}" has duplicate entitlement grants for feature(s): ${duplicates.join(', ')}. Usually a manual-grant + subscription-grant collision.`,
        fix: 'Remove the duplicate manual grant in Stripe or cancel the underlying subscription.',
      });
    }
  }

  // Check 4: users with has_paid_access=true but no stripe_customer_id (blocks migration)
  if (cfg.require_stripe_customer_id) {
    for (const user of users) {
      if (user.hasPaidAccess && !user.stripeCustomerId) {
        findings.push({
          contract: 'entitlements-migration',
          severity: 'high',
          entity: `user:${user.id}`,
          message:
            `User has has_paid_access=true but no stripe_customer_id. This user cannot be migrated ` +
            `to Stripe Entitlements without a backfill — Stripe needs a customer id to grant the entitlement.`,
          fix:
            defaultFix ??
            'Backfill stripe_customer_id for this user (create a Stripe customer and link it), then re-run the migration contract.',
        });
      }
    }
  }

  // Check 1 + 2: per-user comparison
  for (const user of users) {
    if (!user.stripeCustomerId) {
      // Already flagged in Check 4 if has_paid_access=true; skip here.
      continue;
    }

    const grants = entsByCustomerId.get(user.stripeCustomerId);

    if (user.hasPaidAccess && (!grants || grants.length === 0)) {
      // Check 1: paid in DB but no entitlement in Stripe — migration gap
      findings.push({
        contract: 'entitlements-migration',
        severity,
        entity: `user:${user.id}`,
        message:
          `User has has_paid_access=true but no active Stripe Entitlements grant for customer ` +
          `"${user.stripeCustomerId}". Migration gap — user paid but Stripe doesn't know.`,
        fix:
          defaultFix ??
          `Grant the Entitlements feature in Stripe for customer "${user.stripeCustomerId}", then re-run the migration contract.`,
      });
      continue;
    }

    if (!user.hasPaidAccess && grants && grants.length > 0) {
      // Check 2: entitlement in Stripe but DB says no access — stale grant or DB flag not flipped
      const featureSummary = grants.map((g) => g.feature).join(', ');
      findings.push({
        contract: 'entitlements-migration',
        severity: 'medium',
        entity: `user:${user.id}`,
        message:
          `User has an active Stripe Entitlements grant (features: ${featureSummary}) ` +
          `for customer "${user.stripeCustomerId}" but has_paid_access is false. Stripe has a grant your DB doesn't reflect.`,
        fix:
          defaultFix ??
          'Either flip has_paid_access=true in the DB (if the grant is legitimate) or revoke the grant in Stripe.',
      });
    }
  }

  return findings;
}

function groupEntitlementsByCustomerId(
  entitlements: ActiveEntitlement[],
): Map<string, ActiveEntitlement[]> {
  const map = new Map<string, ActiveEntitlement[]>();
  for (const ent of entitlements) {
    const arr = map.get(ent.customerId) ?? [];
    arr.push(ent);
    map.set(ent.customerId, arr);
  }
  return map;
}
