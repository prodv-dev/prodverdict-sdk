import { describe, it, expect } from 'vitest';
import { aggregateVerdict } from './verdict.js';
import type { Finding } from './types.js';

function f(severity: Finding['severity']): Finding {
  return { contract: 'access', severity, entity: 'test', message: 'test' };
}

describe('aggregateVerdict', () => {
  it('returns pass when no findings', () => {
    expect(aggregateVerdict([])).toBe('pass');
  });

  it('returns fail when any high finding', () => {
    expect(aggregateVerdict([f('high'), f('low')])).toBe('fail');
  });

  it('returns warn when only medium findings', () => {
    expect(aggregateVerdict([f('medium')])).toBe('warn');
  });

  it('returns warn when only low findings', () => {
    expect(aggregateVerdict([f('low')])).toBe('warn');
  });

  it('returns fail when high + medium', () => {
    expect(aggregateVerdict([f('medium'), f('high')])).toBe('fail');
  });
});
