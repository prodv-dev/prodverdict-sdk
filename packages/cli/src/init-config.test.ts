import { describe, it, expect } from 'vitest';
import { readFileSync, unlinkSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeInitConfig, writeMcpConfig, writeCursorRule } from './init-config.js';

describe('writeInitConfig', () => {
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
});
