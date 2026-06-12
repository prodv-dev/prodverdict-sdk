import { describe, it, expect } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { runRemoteValidateConfig, runRemoteConfigCheckFromFiles, runRemoteMigrationCheckFromFiles, runRemoteRepoContractsFromFiles, } from './remote-check-runner.js';
import { buildSuggestFixOutput } from './suggest-fix.js';
import { createRemoteMcpServer } from './create-remote-server.js';
const __dirname = dirname(fileURLToPath(import.meta.url));
const examplesRoot = join(__dirname, '../../../examples/nextjs-stripe');
describe('remote-check-runner', () => {
    it('validates YAML without filesystem', async () => {
        const yaml = readFileSync(join(examplesRoot, 'prodverdict.full.yml'), 'utf8');
        const result = await runRemoteValidateConfig(yaml);
        expect(result.valid).toBe(true);
        expect(result.contracts.some((c) => c.type === 'config')).toBe(true);
    });
    it('runs config check from in-memory files', async () => {
        const configYaml = readFileSync(join(examplesRoot, 'prodverdict.full.yml'), 'utf8');
        const agent = await runRemoteConfigCheckFromFiles({
            files: {
                'prodverdict.yml': configYaml,
                '.env.example': 'DATABASE_URL=\nSTRIPE_SECRET_KEY=\n',
                'lib/billing.ts': 'export const db = process.env.DATABASE_URL;\n',
            },
            configPath: 'prodverdict.yml',
            env: {},
        });
        expect(agent.schemaVersion).toBe('1');
        expect(agent.contract).toBe('config');
    });
    it('runs config + migration via check_repo_contracts helper', async () => {
        const configYaml = readFileSync(join(examplesRoot, 'prodverdict.full.yml'), 'utf8');
        const migrationBlock = readFileSync(join(examplesRoot, 'prodverdict.migration.yml'), 'utf8');
        const combinedYaml = `${configYaml.trimEnd()}\n${migrationBlock.replace(/^version: 1\ncontracts:\n/, '')}`;
        const unsafeSql = readFileSync(join(examplesRoot, 'migrations/unsafe/001_add_index.sql'), 'utf8');
        const result = await runRemoteRepoContractsFromFiles({
            files: {
                'prodverdict.yml': combinedYaml,
                '.env.example': 'DATABASE_URL=\nSTRIPE_SECRET_KEY=\n',
                'lib/billing.ts': 'export const x = process.env.DATABASE_URL;\n',
                'migrations/unsafe/001_add_index.sql': unsafeSql,
            },
        });
        expect(result.schemaVersion).toBe('1');
        expect(result.config.contract).toBe('config');
        expect(result.migration.contract).toBe('migration');
        expect(['pass', 'fail', 'warn']).toContain(result.verdict);
    });
    it('runs migration check from in-memory SQL', async () => {
        const configYaml = readFileSync(join(examplesRoot, 'prodverdict.migration.yml'), 'utf8');
        const unsafeSql = readFileSync(join(examplesRoot, 'migrations/unsafe/001_add_index.sql'), 'utf8');
        const agent = await runRemoteMigrationCheckFromFiles({
            files: {
                'prodverdict.yml': configYaml,
                'migrations/unsafe/001_add_index.sql': unsafeSql,
            },
        });
        expect(agent.contract).toBe('migration');
        expect(agent.findings.length).toBeGreaterThan(0);
    });
});
describe('createRemoteMcpServer', () => {
    const deps = {
        authenticate: async () => ({
            projectId: 'proj_test',
            isPro: true,
            githubInstallationId: 12345,
        }),
        fetchRepoFiles: async () => ({
            'prodverdict.yml': readFileSync(join(examplesRoot, 'prodverdict.full.yml'), 'utf8'),
            '.env.example': 'DATABASE_URL=\nSTRIPE_SECRET_KEY=\n',
            'lib/billing.ts': 'export const x = process.env.DATABASE_URL;\n',
        }),
        getRecentRuns: async () => [
            {
                id: 'run_1',
                contract: 'access',
                verdict: 'pass',
                evaluatedAt: new Date().toISOString(),
                source: 'cli',
            },
        ],
    };
    it('creates server with remote tools registered', () => {
        const server = createRemoteMcpServer(deps, () => ({
            projectId: 'proj_test',
            isPro: true,
            githubInstallationId: 12345,
        }));
        expect(server).toBeTruthy();
    });
    it('suggest_fix extracts unique hints', () => {
        const out = buildSuggestFixOutput([
            {
                contract: 'config',
                severity: 'medium',
                entity: 'FOO',
                message: 'missing',
                fix: 'Add FOO to .env.example',
            },
        ]);
        expect(out.count).toBe(1);
    });
});
//# sourceMappingURL=remote-server.test.js.map