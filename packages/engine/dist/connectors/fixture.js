/** In-memory connectors for testing — accepts pre-loaded data */
export function createFixtureStripeReader(subscriptions) {
    return {
        async listSubscriptions() {
            return subscriptions;
        },
    };
}
export function createFixtureDatabaseReader(users) {
    return {
        async listUsers() {
            return users;
        },
    };
}
//# sourceMappingURL=fixture.js.map