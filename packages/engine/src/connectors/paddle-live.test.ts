import { describe, it, expect } from 'vitest';
import { Environment } from '@paddle/paddle-node-sdk';
import { resolvePaddleEnvironment } from './paddle-live.js';

describe('resolvePaddleEnvironment', () => {
  it('defaults to sandbox when unset', () => {
    expect(resolvePaddleEnvironment(undefined)).toBe(Environment.sandbox);
  });

  it('maps "production" to production', () => {
    expect(resolvePaddleEnvironment('production')).toBe(Environment.production);
  });

  it('is case-insensitive (regression: doctor vs live mismatch)', () => {
    expect(resolvePaddleEnvironment('Production')).toBe(Environment.production);
    expect(resolvePaddleEnvironment('PRODUCTION')).toBe(Environment.production);
  });

  it('treats any non-production value as sandbox', () => {
    expect(resolvePaddleEnvironment('sandbox')).toBe(Environment.sandbox);
    expect(resolvePaddleEnvironment('staging')).toBe(Environment.sandbox);
  });
});
