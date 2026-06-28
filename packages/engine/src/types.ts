export type Severity = 'high' | 'medium' | 'low';
export type Verdict = 'pass' | 'warn' | 'fail';
export type ContractType =
  | 'access'
  | 'config'
  | 'migration'
  | 'boundary'
  | 'webhook'
  | 'restore'
  | 'entitlements-migration';

export interface Finding {
  contract: ContractType;
  severity: Severity;
  /** Namespaced entity identifier, e.g. "user:usr_abc" or "price:price_pro" */
  entity: string;
  message: string;
  fix?: string | undefined;
}

export interface CheckResult {
  contract: ContractType;
  verdict: Verdict;
  findings: Finding[];
  evaluatedAt: string;
}

export type ProdVerdictErrorCode = 'CONFIG_INVALID' | 'CONNECTOR_ERROR' | 'UNKNOWN';

export interface ProdVerdictError extends Error {
  code: ProdVerdictErrorCode;
}

const PRODVERDICT_ERROR_CODES = new Set<string>([
  'CONFIG_INVALID',
  'CONNECTOR_ERROR',
  'UNKNOWN',
]);

export function isProdVerdictError(err: unknown): err is ProdVerdictError {
  return (
    err instanceof Error &&
    'code' in err &&
    typeof (err as { code: unknown }).code === 'string' &&
    PRODVERDICT_ERROR_CODES.has((err as { code: string }).code)
  );
}
