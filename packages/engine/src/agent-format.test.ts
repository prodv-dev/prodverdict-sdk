import { describe, it, expect } from 'vitest';
import { toAgentCheckOutput, toAgentDoctorOutput } from './agent-format.js';
import type { CheckResult } from './types.js';

describe('agent-format', () => {
  it('produces stable agent check output', () => {
    const result: CheckResult = {
      contract: 'access',
      verdict: 'fail',
      findings: [
        {
          contract: 'access',
          severity: 'high',
          entity: 'user:1',
          message: 'Revenue leak',
          fix: 'Sync has_paid_access from webhooks.',
        },
      ],
      evaluatedAt: '2026-01-01T00:00:00.000Z',
    };
    const agent = toAgentCheckOutput(result, 1);
    expect(agent).toMatchObject({
      schemaVersion: '1',
      contract: 'access',
      verdict: 'fail',
      exitCode: 1,
      summary: expect.stringContaining('failed'),
      nextSteps: expect.arrayContaining(['Sync has_paid_access from webhooks.']),
    });
  });

  it('produces doctor agent output', () => {
    const agent = toAgentDoctorOutput(false, [
      { name: 'access:env:DATABASE_URL', status: 'fail', message: 'Missing DATABASE_URL' },
    ], [{ type: 'access' }]);
    expect(agent.exitCode).toBe(2);
    expect(agent.ok).toBe(false);
    expect(agent.schemaVersion).toBe('1');
  });
});
