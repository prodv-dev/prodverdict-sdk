import { describe, it, expect } from 'vitest';
import { assertSqlIdentifier } from './sql-identifiers.js';

describe('assertSqlIdentifier', () => {
  it('accepts valid identifiers', () => {
    expect(() => assertSqlIdentifier('users', 'table')).not.toThrow();
    expect(() => assertSqlIdentifier('has_paid_access', 'column')).not.toThrow();
  });

  it('rejects invalid identifiers', () => {
    expect(() => assertSqlIdentifier('users; DROP TABLE', 'table')).toThrow(/Invalid SQL identifier/);
    expect(() => assertSqlIdentifier('1users', 'table')).toThrow(/Invalid SQL identifier/);
  });
});
