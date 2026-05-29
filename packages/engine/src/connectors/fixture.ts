import type { StripeReader, StripeSubscription, DatabaseReader, AppUser } from './types.js';

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
