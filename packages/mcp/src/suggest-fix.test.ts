import { describe, it, expect } from 'vitest';
import { buildSuggestFixOutput } from './suggest-fix.js';

describe('buildSuggestFixOutput', () => {
  it('deduplicates fix hints', () => {
    const result = buildSuggestFixOutput([
      {
        contract: 'access',
        severity: 'high',
        entity: 'user:1',
        message: 'Revenue leak',
        fix: 'Sync has_paid_access from webhooks',
      },
      {
        contract: 'access',
        severity: 'high',
        entity: 'user:2',
        message: 'Revenue leak',
        fix: 'Sync has_paid_access from webhooks',
      },
      {
        contract: 'config',
        severity: 'medium',
        entity: 'STRIPE_SECRET_KEY',
        message: 'Missing',
        fix: 'Add to .env.example',
      },
    ]);

    expect(result.count).toBe(2);
    expect(result.fixes).toContain('Sync has_paid_access from webhooks');
    expect(result.fixes).toContain('Add to .env.example');
  });
});
