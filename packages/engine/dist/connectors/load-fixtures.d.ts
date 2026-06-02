import type { StripeSubscription, AppUser } from './types.js';
export interface FixturePaths {
    stripeSubscriptions: string;
    dbUsers: string;
}
export declare function loadFixtureSubscriptions(filePath: string): StripeSubscription[];
export declare function loadFixtureUsers(filePath: string): AppUser[];
export declare function defaultFixturePaths(fixturesDir: string, billing?: 'stripe' | 'paddle'): FixturePaths;
//# sourceMappingURL=load-fixtures.d.ts.map