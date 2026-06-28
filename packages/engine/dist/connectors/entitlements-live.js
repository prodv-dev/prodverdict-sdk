import Stripe from 'stripe';
function makeConnectorError(message) {
    const err = new Error(message);
    err.code = 'CONNECTOR_ERROR';
    return err;
}
/**
 * Live Stripe Entitlements reader. Lists every active entitlement across every
 * customer by iterating customers and calling the per-customer
 * `/v1/entitlements/active-entitlements` endpoint for each.
 *
 * Requires a restricted Stripe key with `entitlements.read` and `customers: Read`.
 */
export function createLiveEntitlementsReader(secretKeyEnvVar) {
    const key = process.env[secretKeyEnvVar];
    if (!key) {
        throw makeConnectorError(`Missing required env var "${secretKeyEnvVar}" for Stripe Entitlements connector. ` +
            'Provide a restricted read-only Stripe secret key with entitlements.read permission.');
    }
    const client = new Stripe(key, { apiVersion: '2024-06-20' });
    return {
        async listActiveEntitlements() {
            const results = [];
            // Iterate all customers (paginated), then for each customer list their
            // active entitlements. Stripe's activeEntitlements endpoint requires a
            // customer parameter — there is no "list all" variant.
            for await (const customer of client.customers.list({ limit: 100 })) {
                const customerId = customer.id;
                for await (const active of client.entitlements.activeEntitlements.list({
                    customer: customerId,
                    limit: 100,
                })) {
                    const feature = typeof active.feature === 'string' ? active.feature : active.feature?.id;
                    if (!feature)
                        continue;
                    results.push({
                        id: active.id,
                        customerId,
                        feature,
                        lookupKey: active.lookup_key ?? null,
                    });
                }
            }
            return results;
        },
    };
}
//# sourceMappingURL=entitlements-live.js.map