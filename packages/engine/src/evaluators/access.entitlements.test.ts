import { describe, it, expect } from 'vitest';
import { evaluateAccess } from './access.js';
import {
  createFixtureEntitlementsReader,
  createFixtureDatabaseReader,
} from '../connectors/fixture.js';
import type { ActiveEntitlement, AppUser } from '../connectors/types.js';
import type { AccessContractConfig } from '../config/schema.js';

const entCfg: Extract<AccessContractConfig, { source_of_truth: 'stripe_entitlements' }> = {
  type: 'access',
  source_of_truth: 'stripe_entitlements',
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
  // For entitlements, plans map keys are feature lookup_key values (or feature ids).
  plans: { pro: 'pro', starter: 'starter' },
  severity: 'high',
  fix: 'Sync has_paid_access from Entitlements.',
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

describe('evaluateAccess — stripe_entitlements source — pass cases', () => {
  it('returns no findings when DB matches active entitlement grant', async () => {
    const sources = {
      database: createFixtureDatabaseReader([makeUser()]),
      entitlements: createFixtureEntitlementsReader([makeEntitlement()]),
    };
    const findings = await evaluateAccess(entCfg, sources);
    expect(findings).toHaveLength(0);
  });

  it('returns no findings when DB says no access and Stripe has no grant', async () => {
    const sources = {
      database: createFixtureDatabaseReader([makeUser({ hasPaidAccess: false, plan: null })]),
      entitlements: createFixtureEntitlementsReader([]),
    };
    const findings = await evaluateAccess(entCfg, sources);
    expect(findings).toHaveLength(0);
  });
});

describe('evaluateAccess — stripe_entitlements source — revenue leak', () => {
  it('flags when active entitlement exists but has_paid_access=false', async () => {
    const sources = {
      database: createFixtureDatabaseReader([makeUser({ hasPaidAccess: false })]),
      entitlements: createFixtureEntitlementsReader([makeEntitlement()]),
    };
    const findings = await evaluateAccess(entCfg, sources);
    const high = findings.filter((f) => f.severity === 'high');
    expect(high).toHaveLength(1);
    expect(high[0]!.entity).toBe('user:u1');
    expect(high[0]!.message).toMatch(/Revenue leak/);
  });
});

describe('evaluateAccess — stripe_entitlements source — wrongful access', () => {
  it('flags when has_paid_access=true but no active entitlement', async () => {
    const sources = {
      database: createFixtureDatabaseReader([makeUser({ hasPaidAccess: true })]),
      entitlements: createFixtureEntitlementsReader([]),
    };
    const findings = await evaluateAccess(entCfg, sources);
    const high = findings.filter((f) => f.severity === 'high');
    expect(high).toHaveLength(1);
    expect(high[0]!.message).toMatch(/Wrongful access/);
  });
});

describe('evaluateAccess — stripe_entitlements source — plan drift', () => {
  it('flags when user plan does not match the entitlement lookup_key mapping', async () => {
    const sources = {
      database: createFixtureDatabaseReader([makeUser({ plan: 'starter' })]),
      entitlements: createFixtureEntitlementsReader([makeEntitlement({ lookupKey: 'pro' })]),
    };
    const findings = await evaluateAccess(entCfg, sources);
    const planFinding = findings.find((f) => f.message.includes('plan is'));
    expect(planFinding).toBeDefined();
    expect(planFinding!.severity).toBe('high');
  });

  it('flags unknown feature key (not in plans map)', async () => {
    const sources = {
      database: createFixtureDatabaseReader([makeUser()]),
      entitlements: createFixtureEntitlementsReader([
        makeEntitlement({ feature: 'feature_unknown', lookupKey: 'unknown' }),
      ]),
    };
    const findings = await evaluateAccess(entCfg, sources);
    const featureFinding = findings.find((f) => f.entity.startsWith('feature:'));
    expect(featureFinding).toBeDefined();
    expect(featureFinding!.severity).toBe('high');
    expect(featureFinding!.entity).toBe('feature:unknown');
  });
});

describe('evaluateAccess — stripe_entitlements source — duplicate customer', () => {
  it('flags when two users share a stripe_customer_id', async () => {
    const sources = {
      database: createFixtureDatabaseReader([
        makeUser({ id: 'u1' }),
        makeUser({ id: 'u2' }),
      ]),
      entitlements: createFixtureEntitlementsReader([makeEntitlement()]),
    };
    const findings = await evaluateAccess(entCfg, sources);
    const dup = findings.find((f) => f.entity.startsWith('customer:') && f.severity === 'medium');
    expect(dup).toBeDefined();
    expect(dup!.message).toMatch(/Duplicate/);
  });
});

describe('evaluateAccess — stripe_entitlements source — orphan entitlement', () => {
  it('low-severity finding for Stripe customer with active entitlement but no app user', async () => {
    const sources = {
      database: createFixtureDatabaseReader([]),
      entitlements: createFixtureEntitlementsReader([
        makeEntitlement({ customerId: 'cus_orphan' }),
      ]),
    };
    const findings = await evaluateAccess(entCfg, sources);
    const low = findings.find((f) => f.severity === 'low');
    expect(low).toBeDefined();
    expect(low!.entity).toBe('customer:cus_orphan');
  });
});
