import { describe, it, expect } from 'vitest';
import { globToRegExp } from './repo-walk.js';

describe('globToRegExp', () => {
  it('matches files directly under src via src/**/*.ts', () => {
    const re = globToRegExp('src/**/*.ts');
    expect(re.test('src/api.ts')).toBe(true);
    expect(re.test('src/webhook/stripe.ts')).toBe(true);
  });

  it('matches sql directly under migrations via migrations/**/*.sql', () => {
    const re = globToRegExp('migrations/**/*.sql');
    expect(re.test('migrations/001_init.sql')).toBe(true);
    expect(re.test('migrations/unsafe/001_add_index.sql')).toBe(true);
  });
});
