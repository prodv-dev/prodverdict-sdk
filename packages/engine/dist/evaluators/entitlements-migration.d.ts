import type { Finding } from '../types.js';
import type { EntitlementsMigrationContractConfig } from '../config/schema.js';
import type { EntitlementsReader, DatabaseReader } from '../connectors/types.js';
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
export declare function evaluateEntitlementsMigration(cfg: EntitlementsMigrationContractConfig, sources: EntitlementsMigrationDataSources): Promise<Finding[]>;
//# sourceMappingURL=entitlements-migration.d.ts.map