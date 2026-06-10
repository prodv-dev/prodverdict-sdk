import { describe, it, expect } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAccessCheck, runAllChecks } from './check-runner.js';
import { runDoctor, toAgentDoctorOutput } from '@prodverdict/engine';
const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureConfig = join(__dirname, '../../../fixtures/prodverdict.yml');
const fixturesDir = join(__dirname, '../../../fixtures');
describe('MCP check-runner', () => {
    it('runs access check with fixtures', async () => {
        const agent = await runAccessCheck({
            configPath: fixtureConfig,
            useFixtures: true,
            fixturesDir,
        });
        expect(agent.schemaVersion).toBe('1');
        expect(agent.contract).toBe('access');
        expect(agent.summary).toBeTruthy();
    });
    it('runs all checks when only access contract in config', async () => {
        const agent = await runAllChecks({
            configPath: fixtureConfig,
            useFixtures: true,
            fixturesDir,
        });
        expect(agent.contract).toBe('all');
        expect(agent.results.length).toBeGreaterThan(0);
    });
});
describe('MCP doctor', () => {
    it('returns agent doctor output', async () => {
        const result = await runDoctor({
            configPath: fixtureConfig,
            skipConnectivity: true,
        });
        const agent = toAgentDoctorOutput(result.ok, result.checks, result.contracts);
        expect(agent.schemaVersion).toBe('1');
        expect(agent.nextSteps.length).toBeGreaterThan(0);
    });
});
//# sourceMappingURL=server.test.js.map