import Stripe from 'stripe';
function makeConnectorError(message) {
    const err = new Error(message);
    err.code = 'CONNECTOR_ERROR';
    return err;
}
export function createLiveStripeReader(secretKeyEnvVar) {
    const key = process.env[secretKeyEnvVar];
    if (!key) {
        throw makeConnectorError(`Missing required env var "${secretKeyEnvVar}" for Stripe connector. ` +
            'Provide a restricted read-only Stripe secret key.');
    }
    const client = new Stripe(key, { apiVersion: '2024-06-20' });
    return {
        async listSubscriptions() {
            const results = [];
            for await (const sub of client.subscriptions.list({ limit: 100 })) {
                const priceIds = (sub.items?.data ?? [])
                    .map((item) => item.price?.id)
                    .filter((id) => Boolean(id));
                results.push({
                    id: sub.id,
                    customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
                    status: sub.status,
                    priceIds,
                });
            }
            return results;
        },
    };
}
//# sourceMappingURL=stripe-live.js.map