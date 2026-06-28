import type { AccessContractConfig } from '../config/schema.js';
import type { StripeReader } from './types.js';
/**
 * Build a billing-subscription reader for stripe and paddle sources.
 * Note: `stripe_entitlements` source does not use this reader — it uses
 * `createLiveEntitlementsReader` directly. Callers should branch on
 * `source_of_truth` before invoking this factory.
 */
export declare function createLiveBillingReader(cfg: AccessContractConfig): StripeReader;
//# sourceMappingURL=billing-reader.d.ts.map