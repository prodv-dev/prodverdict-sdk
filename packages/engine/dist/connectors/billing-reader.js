import { createLiveStripeReader } from './stripe-live.js';
import { createLivePaddleReader } from './paddle-live.js';
/**
 * Build a billing-subscription reader for stripe and paddle sources.
 * Note: `stripe_entitlements` source does not use this reader — it uses
 * `createLiveEntitlementsReader` directly. Callers should branch on
 * `source_of_truth` before invoking this factory.
 */
export function createLiveBillingReader(cfg) {
    if (cfg.source_of_truth === 'paddle') {
        return createLivePaddleReader(cfg.paddle.api_key_env);
    }
    if (cfg.source_of_truth === 'stripe') {
        return createLiveStripeReader(cfg.stripe.secret_env);
    }
    // stripe_entitlements — should not reach here. Caller is expected to use
    // createLiveEntitlementsReader instead. Throw to fail-closed.
    throw new Error('createLiveBillingReader does not support source_of_truth "stripe_entitlements". ' +
        'Use createLiveEntitlementsReader instead.');
}
//# sourceMappingURL=billing-reader.js.map