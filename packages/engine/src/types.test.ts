import { describe, it, expect } from 'vitest';
import { isProdVerdictError } from './types.js';

describe('isProdVerdictError', () => {
  it('recognizes ProdVerdict error codes', () => {
    const err = Object.assign(new Error('bad config'), { code: 'CONFIG_INVALID' as const });
    expect(isProdVerdictError(err)).toBe(true);
  });

  it('rejects Node system errors with unrelated codes (regression)', () => {
    // e.g. fs ENOENT — must not be mislabeled as a ProdVerdict error.
    const err = Object.assign(new Error('no such file'), { code: 'ENOENT' });
    expect(isProdVerdictError(err)).toBe(false);
  });

  it('rejects plain errors without a code', () => {
    expect(isProdVerdictError(new Error('boom'))).toBe(false);
    expect(isProdVerdictError('not an error')).toBe(false);
  });
});
