import { describe, it, expect } from 'vitest';
import { validateConfig } from './parse.js';

const validRaw = {
  version: 1,
  contracts: [
    {
      type: 'access',
      source_of_truth: 'stripe',
      database: { url_env: 'DATABASE_URL' },
      stripe: { secret_env: 'STRIPE_SECRET_KEY' },
      plans: { price_pro: 'pro', price_starter: 'starter' },
      severity: 'high',
      fix: 'Sync has_paid_access from webhooks.',
    },
  ],
};

describe('validateConfig', () => {
  it('accepts a valid config', () => {
    const cfg = validateConfig(validRaw);
    expect(cfg.version).toBe(1);
    expect(cfg.contracts[0]?.type).toBe('access');
  });

  it('applies default column names', () => {
    const cfg = validateConfig(validRaw);
    const db = cfg.contracts[0]!.database;
    expect(db.columns.id).toBe('id');
    expect(db.columns.has_paid_access).toBe('has_paid_access');
  });

  it('applies default users_table', () => {
    const cfg = validateConfig(validRaw);
    expect(cfg.contracts[0]!.database.users_table).toBe('users');
  });

  it('rejects wrong version', () => {
    expect(() => validateConfig({ ...validRaw, version: 2 })).toThrow('prodverdict.yml is invalid');
  });

  it('rejects missing contracts', () => {
    expect(() => validateConfig({ version: 1 })).toThrow('prodverdict.yml is invalid');
  });

  it('rejects empty contracts array', () => {
    expect(() => validateConfig({ version: 1, contracts: [] })).toThrow('prodverdict.yml is invalid');
  });

  it('rejects missing stripe.secret_env', () => {
    const raw = structuredClone(validRaw);
    // @ts-expect-error intentional invalid input
    delete raw.contracts[0].stripe.secret_env;
    expect(() => validateConfig(raw)).toThrow('prodverdict.yml is invalid');
  });

  it('rejects missing database.url_env', () => {
    const raw = structuredClone(validRaw);
    // @ts-expect-error intentional invalid input
    delete raw.contracts[0].database.url_env;
    expect(() => validateConfig(raw)).toThrow('prodverdict.yml is invalid');
  });
});
