import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { isPaddleStack } from './stacks.js';
const DEFAULT_REMOTE_URL = 'https://prodverdict.com/api/mcp';
export function buildMcpJson(stack) {
    const env = {
        DATABASE_URL: 'postgresql://readonly:...@host/db',
    };
    if (isPaddleStack(stack)) {
        env.PADDLE_API_KEY = 'your-read-only-paddle-key';
        env.PADDLE_ENVIRONMENT = 'sandbox';
    }
    else {
        env.STRIPE_SECRET_KEY = 'rk_live_...';
    }
    return {
        mcpServers: {
            prodverdict: {
                command: 'npx',
                args: ['-y', '@prodverdict/mcp'],
                env,
            },
        },
    };
}
export function buildRemoteMcpJson(input = {}) {
    const projectId = input.projectId ?? 'your-project-uuid';
    const apiKey = input.apiKey ?? 'pv_...';
    const url = input.url ?? DEFAULT_REMOTE_URL;
    return {
        mcpServers: {
            'prodverdict-remote': {
                url,
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'X-Prodverdict-Project-Id': projectId,
                },
            },
        },
    };
}
export function mergeMcpConfigs(base, extra) {
    const baseServers = base.mcpServers ?? {};
    const extraServers = extra.mcpServers ?? {};
    return {
        mcpServers: {
            ...baseServers,
            ...extraServers,
        },
    };
}
export function writeMcpJsonFile(cwd, config) {
    const dir = resolve(cwd, '.cursor');
    mkdirSync(dir, { recursive: true });
    const path = resolve(dir, 'mcp.json');
    let merged = config;
    try {
        const existing = JSON.parse(readFileSync(path, 'utf8'));
        merged = mergeMcpConfigs(existing, config);
    }
    catch {
        // no existing file
    }
    writeFileSync(path, JSON.stringify(merged, null, 2) + '\n', 'utf8');
    return path;
}
//# sourceMappingURL=mcp-config.js.map