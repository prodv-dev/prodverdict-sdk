import type { StripeReader, StripeSubscription, DatabaseReader, AppUser, EntitlementsReader, ActiveEntitlement } from './types.js';
/** In-memory connectors for testing — accepts pre-loaded data */
export declare function createFixtureStripeReader(subscriptions: StripeSubscription[]): StripeReader;
export declare function createFixtureDatabaseReader(users: AppUser[]): DatabaseReader;
export declare function createFixtureEntitlementsReader(entitlements: ActiveEntitlement[]): EntitlementsReader;
//# sourceMappingURL=fixture.d.ts.map