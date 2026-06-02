import { createHash, randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';

/** Mirrors site/lib/api-key.ts — rotate-key and upload auth depend on this shape. */
function generateApiKey(): string {
  return `pv_${randomBytes(24).toString('hex')}`;
}

function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

function verifyApiKey(key: string, hash: string): boolean {
  return hashApiKey(key) === hash;
}

describe('project API key (rotate / upload auth)', () => {
  it('generates pv_ prefix keys', () => {
    const key = generateApiKey();
    expect(key.startsWith('pv_')).toBe(true);
    expect(key.length).toBeGreaterThan(10);
  });

  it('verifyApiKey matches hashApiKey output', () => {
    const key = generateApiKey();
    const hash = hashApiKey(key);
    expect(verifyApiKey(key, hash)).toBe(true);
    expect(verifyApiKey('pv_wrong', hash)).toBe(false);
  });
});
