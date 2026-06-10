import { describe, it, expect } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runDoctor } from './doctor.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureConfig = join(__dirname, '../../../fixtures/prodverdict.yml');

describe('runDoctor', () => {
  it('passes config validation for valid fixture config', async () => {
    const savedDb = process.env.DATABASE_URL;
    const savedStripe = process.env.STRIPE_SECRET_KEY;
    process.env.DATABASE_URL = 'postgresql://localhost/test';
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
    try {
      const result = await runDoctor({
        configPath: fixtureConfig,
        skipConnectivity: true,
      });
      expect(result.ok).toBe(true);
      expect(result.contracts).toEqual([{ type: 'access' }]);
      expect(result.checks.some((c) => c.name === 'config:valid' && c.status === 'pass')).toBe(true);
    } finally {
      if (savedDb === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = savedDb;
      if (savedStripe === undefined) delete process.env.STRIPE_SECRET_KEY;
      else process.env.STRIPE_SECRET_KEY = savedStripe;
    }
  });

  it('fails when config file is missing', async () => {
    const result = await runDoctor({
      configPath: '/nonexistent/prodverdict.yml',
      skipConnectivity: true,
    });
    expect(result.ok).toBe(false);
    expect(result.checks[0]?.status).toBe('fail');
  });

  it('reports missing env vars for access contract', async () => {
    const saved = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    delete process.env.STRIPE_SECRET_KEY;
    try {
      const result = await runDoctor({
        configPath: fixtureConfig,
        skipConnectivity: true,
      });
      expect(result.checks.some((c) => c.name === 'access:env:DATABASE_URL' && c.status === 'fail')).toBe(
        true,
      );
    } finally {
      if (saved !== undefined) process.env.DATABASE_URL = saved;
    }
  });
});
