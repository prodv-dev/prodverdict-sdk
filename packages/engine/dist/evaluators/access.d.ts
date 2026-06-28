import type { Finding } from '../types.js';
import type { AccessContractConfig } from '../config/schema.js';
import type { StripeReader, DatabaseReader, EntitlementsReader } from '../connectors/types.js';
export interface AccessDataSources {
    /** Billing reader for subscription-based sources (stripe, paddle). Optional when source_of_truth is stripe_entitlements. */
    billing?: StripeReader;
    /** Entitlements reader for stripe_entitlements source. */
    entitlements?: EntitlementsReader;
    database: DatabaseReader;
}
export declare function evaluateAccess(cfg: AccessContractConfig, sources: AccessDataSources): Promise<Finding[]>;
//# sourceMappingURL=access.d.ts.map