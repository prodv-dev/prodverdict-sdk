import { describe, it, expect } from 'vitest';
import { evaluateAccess } from './access.js';
import { createFixtureStripeReader, createFixtureDatabaseReader } from '../connectors/fixture.js';
import type { StripeSubscription } from '../connectors/types.js';
import type { AppUser } from '../connectors/types.js';
import type { AccessContractConfig } from '../config/schema.js';

const baseCfg: AccessContractConfig = {
  type: 'access',
  source_of_truth: 'stripe',
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
  stripe: { secret_env: 'STRIPE_SECRET_KEY' },
  plans: { price_pro: 'pro', price_starter: 'starter' },
  severity: 'high',
  fix: 'Sync has_paid_access from webhooks.',
};

function makeSub(overrides: Partial<StripeSubscription> = {}): StripeSubscription {
  return {
    id: 'sub_1',
    customerId: 'cus_1',
    status: 'active',
    priceIds: ['price_pro'],
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

describe('evaluateAccess — pass cases', () => {
  it('returns no findings when everything is aligned', async () => {
    const sources = {
      billing: createFixtureStripeReader([makeSub()]),
      database: createFixtureDatabaseReader([makeUser()]),
    };
    const findings = await evaluateAccess(baseCfg, sources);
    expect(findings).toHaveLength(0);
  });

  it('returns no findings for canceled sub + no access', async () => {
    const sources = {
      billing: createFixtureStripeReader([makeSub({ status: 'canceled' })]),
      database: createFixtureDatabaseReader([makeUser({ hasPaidAccess: false, plan: null })]),
    };
    const findings = await evaluateAccess(baseCfg, sources);
    expect(findings).toHaveLength(0);
  });

  it('ignores users with no stripe_customer_id', async () => {
    const sources = {
      billing: createFixtureStripeReader([]),
      database: createFixtureDatabaseReader([makeUser({ stripeCustomerId: null, hasPaidAccess: false })]),
    };
    const findings = await evaluateAccess(baseCfg, sources);
    expect(findings).toHaveLength(0);
  });
});

describe('evaluateAccess — revenue leak (active sub, no access)', () => {
  it('produces a high finding when active sub + has_paid_access=false', async () => {
    const sources = {
      billing: createFixtureStripeReader([makeSub({ status: 'active' })]),
      database: createFixtureDatabaseReader([makeUser({ hasPaidAccess: false })]),
    };
    const findings = await evaluateAccess(baseCfg, sources);
    const high = findings.filter((f) => f.severity === 'high');
    expect(high).toHaveLength(1);
    expect(high[0]!.entity).toBe('user:u1');
    expect(high[0]!.message).toMatch(/Revenue leak/);
  });

  it('triggers for trialing subscriptions too', async () => {
    const sources = {
      billing: createFixtureStripeReader([makeSub({ status: 'trialing' })]),
      database: createFixtureDatabaseReader([makeUser({ hasPaidAccess: false })]),
    };
    const findings = await evaluateAccess(baseCfg, sources);
    expect(findings.some((f) => f.severity === 'high')).toBe(true);
  });
});

describe('evaluateAccess — wrongful access (lapsed sub, still has access)', () => {
  it('produces a high finding for canceled sub + has_paid_access=true', async () => {
    const sources = {
      billing: createFixtureStripeReader([makeSub({ status: 'canceled' })]),
      database: createFixtureDatabaseReader([makeUser({ hasPaidAccess: true })]),
    };
    const findings = await evaluateAccess(baseCfg, sources);
    const high = findings.filter((f) => f.severity === 'high');
    expect(high).toHaveLength(1);
    expect(high[0]!.message).toMatch(/Wrongful access/);
  });

  it('triggers for unpaid subscriptions', async () => {
    const sources = {
      billing: createFixtureStripeReader([makeSub({ status: 'unpaid' })]),
      database: createFixtureDatabaseReader([makeUser({ hasPaidAccess: true })]),
    };
    const findings = await evaluateAccess(baseCfg, sources);
    expect(findings.some((f) => f.severity === 'high')).toBe(true);
  });

  it('triggers for past_due subscriptions', async () => {
    const sources = {
      billing: createFixtureStripeReader([makeSub({ status: 'past_due' })]),
      database: createFixtureDatabaseReader([makeUser({ hasPaidAccess: true })]),
    };
    const findings = await evaluateAccess(baseCfg, sources);
    expect(findings.some((f) => f.severity === 'high')).toBe(true);
  });
});

describe('evaluateAccess — plan drift', () => {
  it('flags unknown price ID (not in plans map)', async () => {
    const sources = {
      billing: createFixtureStripeReader([makeSub({ priceIds: ['price_unknown'] })]),
      database: createFixtureDatabaseReader([makeUser()]),
    };
    const findings = await evaluateAccess(baseCfg, sources);
    const priceFinding = findings.find((f) => f.entity.startsWith('price:'));
    expect(priceFinding).toBeDefined();
    expect(priceFinding!.severity).toBe('high');
    expect(priceFinding!.entity).toBe('price:price_unknown');
  });

  it('flags plan mismatch between app and Stripe price', async () => {
    const sources = {
      billing: createFixtureStripeReader([makeSub({ priceIds: ['price_starter'] })]),
      database: createFixtureDatabaseReader([makeUser({ plan: 'pro' })]),
    };
    const findings = await evaluateAccess(baseCfg, sources);
    const planFinding = findings.find((f) => f.message.includes('plan is'));
    expect(planFinding).toBeDefined();
    expect(planFinding!.severity).toBe('high');
  });
});

describe('evaluateAccess — duplicate customer', () => {
  it('flags when two users share a stripe_customer_id', async () => {
    const sources = {
      billing: createFixtureStripeReader([makeSub()]),
      database: createFixtureDatabaseReader([
        makeUser({ id: 'u1' }),
        makeUser({ id: 'u2' }),
      ]),
    };
    const findings = await evaluateAccess(baseCfg, sources);
    const dup = findings.find((f) => f.entity.startsWith('customer:'));
    expect(dup).toBeDefined();
    expect(dup!.severity).toBe('medium');
    expect(dup!.message).toMatch(/Duplicate/);
  });
});

describe('evaluateAccess — orphan references', () => {
  it('flags user with customer ID but no Stripe subscriptions found', async () => {
    const sources = {
      billing: createFixtureStripeReader([]),
      database: createFixtureDatabaseReader([makeUser()]),
    };
    const findings = await evaluateAccess(baseCfg, sources);
    expect(findings.some((f) => f.message.includes('no Stripe subscriptions'))).toBe(true);
    expect(findings[0]!.severity).toBe('medium');
  });

  it('low-severity finding for Stripe customer with active sub but no app user', async () => {
    const sources = {
      billing: createFixtureStripeReader([makeSub({ customerId: 'cus_orphan' })]),
      database: createFixtureDatabaseReader([]),
    };
    const findings = await evaluateAccess(baseCfg, sources);
    const low = findings.find((f) => f.severity === 'low');
    expect(low).toBeDefined();
    expect(low!.entity).toBe('customer:cus_orphan');
  });
});

describe('evaluateAccess — config without plans map', () => {
  it('skips plan checks when plans map is absent', async () => {
    const cfg: AccessContractConfig = { ...baseCfg, plans: undefined };
    const sources = {
      billing: createFixtureStripeReader([makeSub({ priceIds: ['price_anything'] })]),
      database: createFixtureDatabaseReader([makeUser()]),
    };
    const findings = await evaluateAccess(cfg, sources);
    const planFindings = findings.filter((f) => f.entity.startsWith('price:'));
    expect(planFindings).toHaveLength(0);
  });
});

describe('evaluateAccess — paddle source', () => {
  const paddleCfg: AccessContractConfig = {
    type: 'access',
    source_of_truth: 'paddle',
    database: baseCfg.database,
    paddle: { api_key_env: 'PADDLE_API_KEY' },
    plans: { pri_pro: 'pro' },
    severity: 'high',
  };

  it('detects revenue leak with paddle fixtures', async () => {
    const sources = {
      billing: createFixtureStripeReader([
        makeSub({ id: 'sub_1', customerId: 'ctm_1', priceIds: ['pri_pro'] }),
      ]),
      database: createFixtureDatabaseReader([
        makeUser({ id: 'u1', stripeCustomerId: 'ctm_1', hasPaidAccess: false }),
      ]),
    };
    const findings = await evaluateAccess(paddleCfg, sources);
    expect(findings.some((f) => f.severity === 'high' && f.message.includes('Paddle'))).toBe(true);
  });
});
