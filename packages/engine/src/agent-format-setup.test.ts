import { describe, it, expect } from 'vitest';
import {
  toAgentSetupOutput,
  toAgentScanOutput,
  toAgentStatusOutput,
} from './agent-format.js';

describe('toAgentSetupOutput', () => {
  it('returns partial when credentials missing', () => {
    const out = toAgentSetupOutput({
      stack: 'nextjs-stripe',
      filesWritten: ['prodverdict.yml', '.github/workflows/prodverdict-hourly.yml'],
      envWired: [],
      missing: ['STRIPE_SECRET_KEY', 'DATABASE_URL'],
      doctorOk: false,
    });
    expect(out.verdict).toBe('partial');
    expect(out.exitCode).toBe(1);
    expect(out.nextSteps.some((s) => s.includes('stripe.com'))).toBe(true);
  });
});

describe('toAgentScanOutput', () => {
  it('suggests setup when no config', () => {
    const out = toAgentScanOutput('/repo', 'nextjs-stripe', false, true, false, [
      { id: 'access', reason: 'Stripe SDK' },
    ]);
    expect(out.nextSteps[0]).toContain('setup --yes');
  });
});

describe('toAgentStatusOutput', () => {
  it('reports ok when all checks pass', () => {
    const out = toAgentStatusOutput([
      { label: 'prodverdict.yml', ok: true, detail: 'found' },
      { label: 'STRIPE_SECRET_KEY', ok: true, detail: 'set' },
    ]);
    expect(out.ok).toBe(true);
    expect(out.exitCode).toBe(0);
  });
});
