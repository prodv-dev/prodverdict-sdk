import { Paddle, Environment } from '@paddle/paddle-node-sdk';
function makeConnectorError(message) {
    const err = new Error(message);
    err.code = 'CONNECTOR_ERROR';
    return err;
}
/** Map Paddle subscription status to the same buckets used for Stripe access rules. */
function normalizeStatus(status) {
    const s = status.toLowerCase();
    if (s === 'paused')
        return 'past_due';
    return s;
}
/**
 * Resolve the Paddle SDK environment from the PADDLE_ENVIRONMENT value.
 * Case-insensitive, defaults to sandbox. Shared so the live connector and
 * `doctor` always target the same environment (e.g. "Production" must not
 * make doctor ping sandbox while live checks hit production).
 */
export function resolvePaddleEnvironment(value) {
    return (value ?? 'sandbox').toLowerCase() === 'production'
        ? Environment.production
        : Environment.sandbox;
}
export function createLivePaddleReader(apiKeyEnvVar) {
    const key = process.env[apiKeyEnvVar];
    if (!key) {
        throw makeConnectorError(`Missing required env var "${apiKeyEnvVar}" for Paddle connector. ` +
            'Provide a restricted API key with subscription.read.');
    }
    const environment = resolvePaddleEnvironment(process.env.PADDLE_ENVIRONMENT);
    const client = new Paddle(key, { environment });
    return {
        async listSubscriptions() {
            const results = [];
            const collection = client.subscriptions.list();
            for await (const sub of collection) {
                const customerId = sub.customerId;
                if (!customerId)
                    continue;
                const priceIds = [];
                for (const item of sub.items ?? []) {
                    const priceId = item.price?.id;
                    if (priceId)
                        priceIds.push(priceId);
                }
                results.push({
                    id: sub.id,
                    customerId,
                    status: normalizeStatus(sub.status),
                    priceIds,
                });
            }
            return results;
        },
    };
}
//# sourceMappingURL=paddle-live.js.map