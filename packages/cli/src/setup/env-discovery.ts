import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

export const SETUP_ENV_VARS = [
  'STRIPE_SECRET_KEY',
  'PADDLE_API_KEY',
  'PADDLE_ENVIRONMENT',
  'DATABASE_URL',
] as const;

export type SetupEnvVar = (typeof SETUP_ENV_VARS)[number];

/** Parse KEY=value lines from dotenv-style files (no multiline / export prefix). */
export function parseDotenvFile(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const withoutExport = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
    const eq = withoutExport.indexOf('=');
    if (eq <= 0) continue;
    const key = withoutExport.slice(0, eq).trim();
    let value = withoutExport.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) out[key] = value;
  }
  return out;
}

/** Read billing + DB vars from .env.local then .env (later files do not override earlier). */
export function discoverEnvVars(cwd: string): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const name of ['.env', '.env.local'] as const) {
    const path = resolve(cwd, name);
    if (!existsSync(path)) continue;
    try {
      const parsed = parseDotenvFile(readFileSync(path, 'utf8'));
      for (const key of SETUP_ENV_VARS) {
        if (parsed[key] !== undefined && parsed[key] !== '') {
          merged[key] = parsed[key]!;
        }
      }
    } catch {
      // skip unreadable env file
    }
  }
  for (const key of SETUP_ENV_VARS) {
    const fromProcess = process.env[key];
    if (fromProcess !== undefined && fromProcess !== '') {
      merged[key] = fromProcess;
    }
  }
  return merged;
}

export function redactEnvValue(key: string, value: string): string {
  if (key === 'DATABASE_URL') {
    try {
      const u = new URL(value);
      if (u.password) u.password = '***';
      if (u.username) u.username = '***';
      return u.toString();
    } catch {
      return 'postgresql://***@***/...';
    }
  }
  if (value.length <= 12) return '***';
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

/** Apply discovered vars to process.env for doctor/check in same run. */
export function applyEnvVars(vars: Record<string, string>): string[] {
  const wired: string[] = [];
  for (const [key, value] of Object.entries(vars)) {
    if (value && process.env[key] !== value) {
      process.env[key] = value;
      wired.push(key);
    } else if (value && process.env[key] === value) {
      wired.push(key);
    }
  }
  return [...new Set(wired)];
}

type McpJson = {
  mcpServers?: Record<
    string,
    { command?: string; args?: string[]; env?: Record<string, string> }
  >;
};

/** Merge prodverdict server env in .cursor/mcp.json without clobbering other servers. */
export function mergeMcpEnv(cwd: string, vars: Record<string, string>): string | null {
  const allowed = Object.fromEntries(
    Object.entries(vars).filter(([k]) =>
      (SETUP_ENV_VARS as readonly string[]).includes(k),
    ),
  );
  if (Object.keys(allowed).length === 0) return null;

  const dir = resolve(cwd, '.cursor');
  mkdirSync(dir, { recursive: true });
  const path = resolve(dir, 'mcp.json');

  let base: McpJson = { mcpServers: {} };
  if (existsSync(path)) {
    try {
      base = JSON.parse(readFileSync(path, 'utf8')) as McpJson;
    } catch {
      base = { mcpServers: {} };
    }
  }

  const servers = base.mcpServers ?? {};
  const existing = servers.prodverdict ?? {
    command: 'npx',
    args: ['-y', '@prodverdict/mcp'],
    env: {},
  };
  servers.prodverdict = {
    ...existing,
    env: { ...existing.env, ...allowed },
  };
  base.mcpServers = servers;

  writeFileSync(path, JSON.stringify(base, null, 2) + '\n', 'utf8');
  return path;
}

export function missingEnvVars(
  provider: 'stripe' | 'paddle',
  vars: Record<string, string>,
): SetupEnvVar[] {
  const missing: SetupEnvVar[] = [];
  if (provider === 'stripe') {
    if (!vars.STRIPE_SECRET_KEY) missing.push('STRIPE_SECRET_KEY');
  } else {
    if (!vars.PADDLE_API_KEY) missing.push('PADDLE_API_KEY');
  }
  if (!vars.DATABASE_URL) missing.push('DATABASE_URL');
  return missing;
}
