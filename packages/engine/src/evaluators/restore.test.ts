import { describe, it, expect } from 'vitest';
import { evaluateRestore } from './restore.js';

describe('evaluateRestore', () => {
  it('runs backup, restore, and smoke queries via injectable runner', async () => {
    const calls: string[] = [];
    const findings = await evaluateRestore(
      {
        type: 'restore',
        backup_command: 'pg_dump',
        restore_command: 'pg_restore',
        smoke_queries: ['SELECT 1'],
        severity: 'high',
      },
      {
        env: { DATABASE_URL: 'postgres://localhost/test' },
        runCommand: async (cmd) => {
          calls.push(cmd);
          return { exitCode: 0, stderr: '' };
        },
        runQuery: async (query) => {
          calls.push(query);
          return true;
        },
      },
    );

    expect(findings).toHaveLength(0);
    expect(calls).toContain('pg_dump');
    expect(calls).toContain('pg_restore');
    expect(calls).toContain('SELECT 1');
  });

  it('reports backup failure', async () => {
    const findings = await evaluateRestore(
      {
        type: 'restore',
        backup_command: 'pg_dump',
        restore_command: 'pg_restore',
        smoke_queries: [],
        severity: 'high',
      },
      {
        env: {},
        runCommand: async () => ({ exitCode: 1, stderr: 'fail' }),
      },
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]!.entity).toBe('restore:backup');
  });
});
