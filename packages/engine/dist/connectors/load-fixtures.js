import { readFileSync } from 'fs';
import { join } from 'path';
export function loadFixtureSubscriptions(filePath) {
    const raw = JSON.parse(readFileSync(filePath, 'utf8'));
    return raw.map((item) => ({
        id: item.id,
        customerId: item.customerId,
        status: item.status,
        priceIds: item.priceIds,
    }));
}
export function loadFixtureUsers(filePath) {
    const raw = JSON.parse(readFileSync(filePath, 'utf8'));
    return raw.map((row) => ({
        id: row.id,
        stripeCustomerId: row.stripe_customer_id,
        hasPaidAccess: row.has_paid_access,
        plan: row.plan,
    }));
}
export function defaultFixturePaths(fixturesDir, billing = 'stripe') {
    return {
        stripeSubscriptions: join(fixturesDir, billing, 'subscriptions.json'),
        dbUsers: join(fixturesDir, 'db', 'users.json'),
    };
}
//# sourceMappingURL=load-fixtures.js.map