import type { StripeReader, StripeSubscription, DatabaseReader, AppUser } from './types.js';
/** In-memory connectors for testing — accepts pre-loaded data */
export declare function createFixtureStripeReader(subscriptions: StripeSubscription[]): StripeReader;
export declare function createFixtureDatabaseReader(users: AppUser[]): DatabaseReader;
//# sourceMappingURL=fixture.d.ts.map