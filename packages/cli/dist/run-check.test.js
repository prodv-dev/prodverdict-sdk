import { describe, it, expect } from 'vitest';
import { runCheck } from './run-check.js';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureConfig = join(__dirname, '../../../fixtures/prodverdict.yml');
describe('runCheck with fixtures', () => {
    it('returns pass when everything is in sync', async () => {
        const { result, exitCode } = await runCheck({
            config: fixtureConfig,
            contract: 'access',
            format: 'json',
            fixtures: true,
        });
        // Fixture data is intentionally clean (pass case)
        expect(result.contract).toBe('access');
        expect(['pass', 'warn', 'fail']).toContain(result.verdict);
        expect(Array.isArray(result.findings)).toBe(true);
        expect(typeof result.evaluatedAt).toBe('string');
        // Exit code matches verdict
        expect(exitCode).toBe(result.verdict === 'fail' ? 1 : 0);
    });
    it('JSON output shape is stable', async () => {
        const { result } = await runCheck({
            config: fixtureConfig,
            format: 'json',
            fixtures: true,
        });
        expect(result).toMatchObject({
            contract: 'access',
            verdict: expect.stringMatching(/^(pass|warn|fail)$/),
            findings: expect.any(Array),
            evaluatedAt: expect.any(String),
        });
    });
});
describe('runCheck error handling', () => {
    it('throws CONFIG_INVALID for a missing config file', async () => {
        await expect(runCheck({ config: '/nonexistent/path/prodverdict.yml', format: 'json', fixtures: true })).rejects.toMatchObject({ code: 'CONFIG_INVALID' });
    });
    it('throws for unknown contract type', async () => {
        await expect(runCheck({ config: fixtureConfig, contract: 'banana', format: 'json', fixtures: true })).rejects.toMatchObject({ code: 'CONFIG_INVALID' });
    });
});
//# sourceMappingURL=run-check.test.js.map