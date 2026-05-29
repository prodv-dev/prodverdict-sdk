import type { Finding, Verdict } from './types.js';

export function aggregateVerdict(findings: Finding[]): Verdict {
  if (findings.some((f) => f.severity === 'high')) return 'fail';
  if (findings.some((f) => f.severity === 'medium' || f.severity === 'low')) return 'warn';
  return 'pass';
}
