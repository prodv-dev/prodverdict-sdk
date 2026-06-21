import { describe, it, expect } from 'vitest';
import { readFileSync, unlinkSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeInitConfig, writeMcpConfig, writeRemoteMcpConfig, writeCursorRule } from './init-config.js';

describe('writeInitConfig', () => {
  it('writes supabase-paddle yaml', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pv-init-'));
    const path = writeInitConfig(dir, 'supabase-paddle', 'prodverdict.yml');
    const content = readFileSync(path, 'utf8');
    expect(content).toContain('users_table: profiles');
    expect(content).toContain('source_of_truth: paddle');
    unlinkSync(path);
  });

  it('writes paddle stack yaml', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pv-init-'));
    const path = writeInitConfig(dir, 'paddle-stripe', 'prodverdict.yml');
    const content = readFileSync(path, 'utf8');
    expect(content).toContain('source_of_truth: paddle');
    expect(content).toContain('type: config');
    unlinkSync(path);
  });

  it('writes mcp.json and cursor rule', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pv-init-'));
    const mcpPath = writeMcpConfig(dir, 'nextjs-stripe');
    const rulePath = writeCursorRule(dir);
    expect(readFileSync(mcpPath, 'utf8')).toContain('prodverdict');
    expect(readFileSync(rulePath, 'utf8')).toContain('ProdVerdict');
  });

  it('merges remote MCP into mcp.json', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pv-init-'));
    writeMcpConfig(dir, 'nextjs-stripe');
    const path = writeRemoteMcpConfig(dir, {
      projectId: 'proj-abc',
      apiKey: 'pv_test_key',
    });
    const content = readFileSync(path, 'utf8');
    expect(content).toContain('prodverdict-remote');
    expect(content).toContain('proj-abc');
    expect(content).toContain('pv_test_key');
    expect(content).toContain('"prodverdict"');
  });
});
