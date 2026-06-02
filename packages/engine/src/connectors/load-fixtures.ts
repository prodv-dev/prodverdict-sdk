import { readFileSync } from 'fs';
import { join } from 'path';
import type { StripeSubscription, AppUser } from './types.js';

export interface FixturePaths {
  stripeSubscriptions: string;
  dbUsers: string;
}

export function loadFixtureSubscriptions(filePath: string): StripeSubscription[] {
  const raw = JSON.parse(readFileSync(filePath, 'utf8')) as Array<{
    id: string;
    customerId: string;
    status: string;
    priceIds: string[];
  }>;
  return raw.map((item) => ({
    id: item.id,
    customerId: item.customerId,
    status: item.status,
    priceIds: item.priceIds,
  }));
}

export function loadFixtureUsers(filePath: string): AppUser[] {
  const raw = JSON.parse(readFileSync(filePath, 'utf8')) as Array<{
    id: string;
    stripe_customer_id: string | null;
    has_paid_access: boolean;
    plan: string | null;
  }>;
  return raw.map((row) => ({
    id: row.id,
    stripeCustomerId: row.stripe_customer_id,
    hasPaidAccess: row.has_paid_access,
    plan: row.plan,
  }));
}

export function defaultFixturePaths(
  fixturesDir: string,
  billing: 'stripe' | 'paddle' = 'stripe',
): FixturePaths {
  return {
    stripeSubscriptions: join(fixturesDir, billing, 'subscriptions.json'),
    dbUsers: join(fixturesDir, 'db', 'users.json'),
  };
}
