import type {
  StripeReader,
  StripeSubscription,
  DatabaseReader,
  AppUser,
  EntitlementsReader,
  ActiveEntitlement,
} from './types.js';

/** In-memory connectors for testing — accepts pre-loaded data */
export function createFixtureStripeReader(subscriptions: StripeSubscription[]): StripeReader {
  return {
    async listSubscriptions() {
      return subscriptions;
    },
  };
}

export function createFixtureDatabaseReader(users: AppUser[]): DatabaseReader {
  return {
    async listUsers() {
      return users;
    },
  };
}

export function createFixtureEntitlementsReader(entitlements: ActiveEntitlement[]): EntitlementsReader {
  return {
    async listActiveEntitlements() {
      return entitlements;
    },
  };
}
