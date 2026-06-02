import { createLiveStripeReader } from './stripe-live.js';
import { createLivePaddleReader } from './paddle-live.js';
export function createLiveBillingReader(cfg) {
    if (cfg.source_of_truth === 'paddle') {
        return createLivePaddleReader(cfg.paddle.api_key_env);
    }
    return createLiveStripeReader(cfg.stripe.secret_env);
}
//# sourceMappingURL=billing-reader.js.map