import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { isProdVerdictError } from '@prodverdict/engine';
import { runRemoteValidateConfig, runRemoteConfigCheckFromFiles, runRemoteMigrationCheckFromFiles, runRemoteRepoContractsFromFiles, } from './remote-check-runner.js';
import { registerPrompts } from './prompts.js';
import { registerResources } from './resources.js';
import { buildSuggestFixOutput } from './suggest-fix.js';
const configYamlSchema = z
    .string()
    .optional()
    .describe('Raw prodverdict.yml contents. Required when not reading from GitHub.');
const configPathSchema = z
    .string()
    .optional()
    .describe('Path to prodverdict.yml in the repo. Defaults to prodverdict.yml.');
const repoSchema = {
    owner: z.string().describe('GitHub repository owner'),
    repo: z.string().describe('GitHub repository name'),
    ref: z.string().optional().describe('Git ref (branch, tag, or SHA). Defaults to default branch.'),
};
function toolError(err) {
    const message = isProdVerdictError(err)
        ? `[${err.code}] ${err.message}`
        : String(err);
    return {
        content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
        isError: true,
    };
}
function toolJson(data) {
    return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
}
function requirePro(auth) {
    if (!auth) {
        throw new Error('Missing Authorization: Bearer pv_... and X-Prodverdict-Project-Id header.');
    }
    if (!auth.isPro) {
        throw new Error('Pro subscription required for this tool.');
    }
}
function requireGitHub(auth) {
    if (!auth.githubInstallationId) {
        throw new Error('Connect GitHub App to this project in the ProdVerdict dashboard.');
    }
}
export function createRemoteMcpServer(deps, getAuth) {
    const server = new McpServer({
        name: 'prodverdict-remote',
        version: '0.8.0',
    });
    server.tool('validate_config', 'Parse and validate prodverdict.yml without running checks. Free tier — YAML upload or GitHub file read.', {
        configYaml: configYamlSchema,
        configPath: configPathSchema,
        ...repoSchema,
    }, async ({ configYaml, configPath, owner, repo, ref }) => {
        try {
            if (configYaml) {
                const result = await runRemoteValidateConfig(configYaml);
                return toolJson(result);
            }
            if (owner && repo) {
                const auth = getAuth();
                const files = await deps.fetchRepoFiles(auth ?? { projectId: '', isPro: false, githubInstallationId: null }, { owner, repo, ref });
                const path = configPath ?? 'prodverdict.yml';
                const yaml = files[path];
                if (!yaml) {
                    throw new Error(`Config file not found in repo: ${path}`);
                }
                const result = await runRemoteValidateConfig(yaml);
                return toolJson(result);
            }
            throw new Error('Provide configYaml or owner+repo for GitHub read.');
        }
        catch (err) {
            return toolError(err);
        }
    });
    server.tool('check_config_contract', 'Run config contract using GitHub App repo read (source + .env.example). Pro tier. No billing secrets on cloud.', {
        configPath: configPathSchema,
        ...repoSchema,
    }, async ({ configPath, owner, repo, ref }) => {
        try {
            const auth = getAuth();
            requirePro(auth);
            requireGitHub(auth);
            const files = await deps.fetchRepoFiles(auth, { owner, repo, ref });
            const agent = await runRemoteConfigCheckFromFiles({
                files,
                configPath,
                env: {},
            });
            return toolJson(agent);
        }
        catch (err) {
            return toolError(err);
        }
    });
    server.tool('check_migration_contract', 'Run migration contract using GitHub App SQL reads. Pro tier. No billing secrets on cloud.', {
        configPath: configPathSchema,
        ...repoSchema,
    }, async ({ configPath, owner, repo, ref }) => {
        try {
            const auth = getAuth();
            requirePro(auth);
            requireGitHub(auth);
            const files = await deps.fetchRepoFiles(auth, { owner, repo, ref });
            const agent = await runRemoteMigrationCheckFromFiles({ files, configPath });
            return toolJson(agent);
        }
        catch (err) {
            return toolError(err);
        }
    });
    server.tool('check_repo_contracts', 'Run config + migration contracts in one call via GitHub App repo read. Pro tier. No billing secrets on cloud.', {
        configPath: configPathSchema,
        ...repoSchema,
    }, async ({ configPath, owner, repo, ref }) => {
        try {
            const auth = getAuth();
            requirePro(auth);
            requireGitHub(auth);
            const files = await deps.fetchRepoFiles(auth, { owner, repo, ref });
            const result = await runRemoteRepoContractsFromFiles({
                files,
                configPath,
                env: {},
            });
            return toolJson(result);
        }
        catch (err) {
            return toolError(err);
        }
    });
    server.tool('get_recent_runs', 'List recent contract runs uploaded to the ProdVerdict dashboard. Pro tier. Requires API key.', {
        limit: z
            .number()
            .int()
            .min(1)
            .max(100)
            .optional()
            .describe('Max runs to return (default 20)'),
    }, async ({ limit }) => {
        try {
            const auth = getAuth();
            requirePro(auth);
            const runs = await deps.getRecentRuns(auth, limit ?? 20);
            return toolJson({ schemaVersion: '1', runs, count: runs.length });
        }
        catch (err) {
            return toolError(err);
        }
    });
    server.tool('suggest_fix', 'Extract fix suggestions from ProdVerdict findings. Returns deduplicated fix instructions. No LLM is used.', {
        findings: z
            .array(z.object({
            contract: z.string(),
            severity: z.enum(['high', 'medium', 'low']),
            entity: z.string(),
            message: z.string(),
            fix: z.string().optional(),
        }))
            .describe('Findings from any check_* tool output'),
    }, async ({ findings }) => {
        return toolJson(buildSuggestFixOutput(findings));
    });
    registerPrompts(server, 'remote');
    registerResources(server);
    return server;
}
//# sourceMappingURL=create-remote-server.js.map