import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { InitStack } from './init-config.js';

export type RemoteMcpConfigInput = {
  projectId?: string;
  apiKey?: string;
  url?: string;
};

const DEFAULT_REMOTE_URL = 'https://prodverdict.com/api/mcp';

export function buildMcpJson(stack: InitStack): Record<string, unknown> {
  const env: Record<string, string> = {
    DATABASE_URL: 'postgresql://readonly:...@host/db',
  };

  if (stack === 'paddle-stripe') {
    env.PADDLE_API_KEY = 'your-read-only-paddle-key';
    env.PADDLE_ENVIRONMENT = 'sandbox';
  } else {
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

export function buildRemoteMcpJson(input: RemoteMcpConfigInput = {}): Record<string, unknown> {
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

export function mergeMcpConfigs(
  base: Record<string, unknown>,
  extra: Record<string, unknown>,
): Record<string, unknown> {
  const baseServers =
    (base.mcpServers as Record<string, unknown> | undefined) ?? {};
  const extraServers =
    (extra.mcpServers as Record<string, unknown> | undefined) ?? {};

  return {
    mcpServers: {
      ...baseServers,
      ...extraServers,
    },
  };
}

export function writeMcpJsonFile(cwd: string, config: Record<string, unknown>): string {
  const dir = resolve(cwd, '.cursor');
  mkdirSync(dir, { recursive: true });
  const path = resolve(dir, 'mcp.json');

  let merged = config;
  try {
    const existing = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
    merged = mergeMcpConfigs(existing, config);
  } catch {
    // no existing file
  }

  writeFileSync(path, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  return path;
}
