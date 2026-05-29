import { describe, it, expect } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadFixtureSubscriptions, loadFixtureUsers, defaultFixturePaths } from './load-fixtures.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../../../../fixtures');

describe('load-fixtures', () => {
  it('loads stripe and db fixture JSON', () => {
    const paths = defaultFixturePaths(fixturesDir);
    const subs = loadFixtureSubscriptions(paths.stripeSubscriptions);
    const users = loadFixtureUsers(paths.dbUsers);

    expect(subs).toHaveLength(2);
    expect(users).toHaveLength(2);
    expect(subs[0]?.customerId).toBe('cus_fixture_active');
    expect(users[0]?.hasPaidAccess).toBe(true);
  });
});
