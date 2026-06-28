import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  parseDotenvFile,
  discoverEnvVars,
  redactEnvValue,
  mergeMcpEnv,
  missingEnvVars,
} from './env-discovery.js';

describe('parseDotenvFile', () => {
  it('parses KEY=value and skips comments', () => {
    const parsed = parseDotenvFile(`
# comment
STRIPE_SECRET_KEY=rk_live_abc123
DATABASE_URL=postgresql://u:p@host/db
export PADDLE_API_KEY=pdl_test
`);
    expect(parsed.STRIPE_SECRET_KEY).toBe('rk_live_abc123');
    expect(parsed.DATABASE_URL).toBe('postgresql://u:p@host/db');
    expect(parsed.PADDLE_API_KEY).toBe('pdl_test');
  });
});

describe('redactEnvValue', () => {
  it('redacts database URLs', () => {
    const redacted = redactEnvValue(
      'DATABASE_URL',
      'postgresql://user:secret@db.example.com/mydb',
    );
    expect(redacted).not.toContain('secret');
    expect(redacted).toContain('db.example.com');
  });

  it('redacts API keys', () => {
    const redacted = redactEnvValue('STRIPE_SECRET_KEY', 'rk_live_abcdefghijklmnop');
    expect(redacted).not.toBe('rk_live_abcdefghijklmnop');
    expect(redacted).toContain('…');
  });
});

describe('discoverEnvVars', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'pv-env-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('reads .env.local over .env for same key', () => {
    writeFileSync(join(dir, '.env'), 'STRIPE_SECRET_KEY=from_env\n');
    writeFileSync(join(dir, '.env.local'), 'STRIPE_SECRET_KEY=from_local\n');
    const vars = discoverEnvVars(dir);
    expect(vars.STRIPE_SECRET_KEY).toBe('from_local');
  });
});

describe('mergeMcpEnv', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'pv-mcp-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes prodverdict env into .cursor/mcp.json', () => {
    const path = mergeMcpEnv(dir, {
      STRIPE_SECRET_KEY: 'rk_live_test123456',
      DATABASE_URL: 'postgresql://u:p@host/db',
    });
    expect(path).toBeTruthy();
    const json = JSON.parse(readFileSync(join(dir, '.cursor/mcp.json'), 'utf8')) as {
      mcpServers: { prodverdict: { env: Record<string, string> } };
    };
    expect(json.mcpServers.prodverdict.env.STRIPE_SECRET_KEY).toBe('rk_live_test123456');
  });

  it('preserves other MCP servers', () => {
    mkdirSync(join(dir, '.cursor'), { recursive: true });
    writeFileSync(
      join(dir, '.cursor/mcp.json'),
      JSON.stringify({
        mcpServers: {
          other: { command: 'echo' },
        },
      }),
      'utf8',
    );
    mergeMcpEnv(dir, { DATABASE_URL: 'postgresql://u:p@host/db' });
    const json = JSON.parse(readFileSync(join(dir, '.cursor/mcp.json'), 'utf8')) as {
      mcpServers: Record<string, unknown>;
    };
    expect(json.mcpServers.other).toBeDefined();
    expect(json.mcpServers.prodverdict).toBeDefined();
  });
});

describe('missingEnvVars', () => {
  it('requires stripe and database for stripe stacks', () => {
    expect(missingEnvVars('stripe', {})).toEqual(['STRIPE_SECRET_KEY', 'DATABASE_URL']);
    expect(
      missingEnvVars('stripe', {
        STRIPE_SECRET_KEY: 'rk_live_x',
        DATABASE_URL: 'postgresql://x',
      }),
    ).toEqual([]);
  });

  it('requires paddle key for paddle stacks', () => {
    expect(missingEnvVars('paddle', { DATABASE_URL: 'postgresql://x' })).toEqual([
      'PADDLE_API_KEY',
    ]);
  });
});
