import { describe, it, expect } from 'vitest';
import { readFileSync, unlinkSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeInitConfig } from './init-config.js';

describe('writeInitConfig', () => {
  it('writes paddle stack yaml', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pv-init-'));
    const path = writeInitConfig(dir, 'paddle-stripe', 'prodverdict.yml');
    const content = readFileSync(path, 'utf8');
    expect(content).toContain('source_of_truth: paddle');
    expect(content).toContain('type: config');
    unlinkSync(path);
  });
});
