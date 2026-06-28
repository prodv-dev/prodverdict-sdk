import type { EntitlementsReader } from './types.js';
/**
 * Live Stripe Entitlements reader. Lists every active entitlement across every
 * customer by iterating customers and calling the per-customer
 * `/v1/entitlements/active-entitlements` endpoint for each.
 *
 * Requires a restricted Stripe key with `entitlements.read` and `customers: Read`.
 */
export declare function createLiveEntitlementsReader(secretKeyEnvVar: string): EntitlementsReader;
//# sourceMappingURL=entitlements-live.d.ts.map