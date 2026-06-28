import { describe, it, expect } from 'vitest';
import { evaluateEntitlementsMigration } from './entitlements-migration.js';
import {
  createFixtureEntitlementsReader,
  createFixtureDatabaseReader,
} from '../connectors/fixture.js';
import type { ActiveEntitlement, AppUser } from '../connectors/types.js';
import type { EntitlementsMigrationContractConfig } from '../config/schema.js';

const cfg: EntitlementsMigrationContractConfig = {
  type: 'entitlements-migration',
  database: {
    url_env: 'DATABASE_URL',
    users_table: 'users',
    columns: {
      id: 'id',
      stripe_customer_id: 'stripe_customer_id',
      has_paid_access: 'has_paid_access',
      plan: 'plan',
    },
  },
  entitlements: { secret_env: 'STRIPE_SECRET_KEY' },
  require_stripe_customer_id: true,
  severity: 'high',
  fix: 'Grant the entitlement in Stripe.',
};

function makeEntitlement(overrides: Partial<ActiveEntitlement> = {}): ActiveEntitlement {
  return {
    id: 'ent_1',
    customerId: 'cus_1',
    feature: 'feature_pro',
    lookupKey: 'pro',
    ...overrides,
  };
}

function makeUser(overrides: Partial<AppUser> = {}): AppUser {
  return {
    id: 'u1',
    stripeCustomerId: 'cus_1',
    hasPaidAccess: true,
    plan: 'pro',
    ...overrides,
  };
}

describe('evaluateEntitlementsMigration — pass cases', () => {
  it('returns no findings when DB paid users match Stripe active entitlements', async () => {
    const sources = {
      database: createFixtureDatabaseReader([makeUser()]),
      entitlements: createFixtureEntitlementsReader([makeEntitlement()]),
    };
    const findings = await evaluateEntitlementsMigration(cfg, sources);
    expect(findings).toHaveLength(0);
  });

  it('returns no findings when both DB and Stripe agree on no access', async () => {
    const sources = {
      database: createFixtureDatabaseReader([makeUser({ hasPaidAccess: false, plan: null })]),
      entitlements: createFixtureEntitlementsReader([]),
    };
    const findings = await evaluateEntitlementsMigration(cfg, sources);
    expect(findings).toHaveLength(0);
  });
});

describe('evaluateEntitlementsMigration — migration gap (Check 1)', () => {
  it('flags high when DB has_paid_access=true but no Stripe entitlement', async () => {
    const sources = {
      database: createFixtureDatabaseReader([makeUser({ hasPaidAccess: true })]),
      entitlements: createFixtureEntitlementsReader([]),
    };
    const findings = await evaluateEntitlementsMigration(cfg, sources);
    const high = findings.filter((f) => f.severity === 'high');
    expect(high).toHaveLength(1);
    expect(high[0]!.entity).toBe('user:u1');
    expect(high[0]!.message).toMatch(/Migration gap/);
  });
});

describe('evaluateEntitlementsMigration — stale grant (Check 2)', () => {
  it('flags medium when Stripe has an entitlement but DB has_paid_access=false', async () => {
    const sources = {
      database: createFixtureDatabaseReader([makeUser({ hasPaidAccess: false, plan: null })]),
      entitlements: createFixtureEntitlementsReader([makeEntitlement()]),
    };
    const findings = await evaluateEntitlementsMigration(cfg, sources);
    const medium = findings.find((f) => f.severity === 'medium' && f.entity === 'user:u1');
    expect(medium).toBeDefined();
    expect(medium!.message).toMatch(/Stripe has a grant your DB doesn't reflect/);
  });
});

describe('evaluateEntitlementsMigration — duplicate feature grants (Check 3)', () => {
  it('flags medium when a customer has duplicate entitlements for the same feature', async () => {
    const sources = {
      database: createFixtureDatabaseReader([makeUser()]),
      entitlements: createFixtureEntitlementsReader([
        makeEntitlement({ id: 'ent_1', feature: 'feature_pro' }),
        makeEntitlement({ id: 'ent_2', feature: 'feature_pro' }),
      ]),
    };
    const findings = await evaluateEntitlementsMigration(cfg, sources);
    const dup = findings.find((f) => f.entity === 'customer:cus_1' && f.severity === 'medium');
    expect(dup).toBeDefined();
    expect(dup!.message).toMatch(/duplicate entitlement grants/);
  });

  it('does not flag when a customer has entitlements for different features', async () => {
    const sources = {
      database: createFixtureDatabaseReader([makeUser()]),
      entitlements: createFixtureEntitlementsReader([
        makeEntitlement({ id: 'ent_1', feature: 'feature_pro' }),
        makeEntitlement({ id: 'ent_2', feature: 'feature_extra' }),
      ]),
    };
    const findings = await evaluateEntitlementsMigration(cfg, sources);
    const dup = findings.find(
      (f) => f.entity === 'customer:cus_1' && f.message.includes('duplicate'),
    );
    expect(dup).toBeUndefined();
  });
});

describe('evaluateEntitlementsMigration — missing customer_id (Check 4)', () => {
  it('flags high when has_paid_access=true but no stripe_customer_id', async () => {
    const sources = {
      database: createFixtureDatabaseReader([
        makeUser({ hasPaidAccess: true, stripeCustomerId: null }),
      ]),
      entitlements: createFixtureEntitlementsReader([]),
    };
    const findings = await evaluateEntitlementsMigration(cfg, sources);
    const high = findings.filter((f) => f.severity === 'high');
    expect(high).toHaveLength(1);
    expect(high[0]!.message).toMatch(/no stripe_customer_id/);
  });

  it('skips the missing-customer_id check when require_stripe_customer_id=false', async () => {
    const localCfg: EntitlementsMigrationContractConfig = {
      ...cfg,
      require_stripe_customer_id: false,
    };
    const sources = {
      database: createFixtureDatabaseReader([
        makeUser({ hasPaidAccess: true, stripeCustomerId: null }),
      ]),
      entitlements: createFixtureEntitlementsReader([]),
    };
    const findings = await evaluateEntitlementsMigration(localCfg, sources);
    expect(findings).toHaveLength(0);
  });
});
