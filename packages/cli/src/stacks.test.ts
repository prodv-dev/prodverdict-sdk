import { describe, it, expect } from 'vitest';
import {
  STACK_ORDER,
  buildProdverdictYaml,
  formatStackListTable,
  initNextSteps,
  isPaddleStack,
  isStackTemplate,
} from './stacks.js';

describe('stacks', () => {
  it('includes seven templates', () => {
    expect(STACK_ORDER).toHaveLength(7);
    expect(isStackTemplate('supabase-paddle')).toBe(true);
    expect(isStackTemplate('neon-stripe')).toBe(true);
    expect(isStackTemplate('clerk-stripe')).toBe(true);
  });

  it('builds supabase-paddle yaml with profiles and paddle', () => {
    const yaml = buildProdverdictYaml('supabase-paddle');
    expect(yaml).toContain('users_table: profiles');
    expect(yaml).toContain('source_of_truth: paddle');
    expect(yaml).toContain('PADDLE_API_KEY');
  });

  it('builds clerk-stripe with stripe and clerk hint in fix', () => {
    const yaml = buildProdverdictYaml('clerk-stripe', { includeConfig: false });
    expect(yaml).toContain('source_of_truth: stripe');
    expect(yaml).toContain('Clerk handles auth');
  });

  it('classifies paddle stacks', () => {
    expect(isPaddleStack('paddle-stripe')).toBe(true);
    expect(isPaddleStack('supabase-paddle')).toBe(true);
    expect(isPaddleStack('nextjs-stripe')).toBe(false);
  });

  it('formats stack list table', () => {
    const table = formatStackListTable();
    expect(table).toContain('supabase-paddle');
    expect(table).toContain('neon-stripe');
  });

  it('returns fixture next steps', () => {
    const steps = initNextSteps('supabase-paddle');
    expect(steps[0]).toContain('examples/supabase-paddle');
    expect(steps[1]).toContain('doctor');
  });
});
