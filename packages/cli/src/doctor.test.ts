import { describe, it, expect } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runDoctorCli, formatDoctorText } from './doctor-cli.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureConfig = join(__dirname, '../../../fixtures/prodverdict.yml');

describe('runDoctorCli', () => {
  it('returns agent format with schema version', async () => {
    const { result, exitCode } = await runDoctorCli({
      config: fixtureConfig,
      format: 'agent',
      skipConnectivity: true,
    });
    expect('schemaVersion' in result && result.schemaVersion).toBe('1');
    expect('summary' in result && typeof result.summary).toBe('string');
    expect(exitCode).toBeGreaterThanOrEqual(0);
  });

  it('formats text output', async () => {
    const { result } = await runDoctorCli({
      config: fixtureConfig,
      format: 'text',
      skipConnectivity: true,
    });
    const text = formatDoctorText(result as import('@prodverdict/engine').DoctorResult);
    expect(text).toContain('Doctor');
  });
});
