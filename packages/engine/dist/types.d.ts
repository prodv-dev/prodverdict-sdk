export type Severity = 'high' | 'medium' | 'low';
export type Verdict = 'pass' | 'warn' | 'fail';
export type ContractType = 'access' | 'config' | 'migration' | 'boundary' | 'restore';
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
export interface ProdVerdictError extends Error {
    code: 'CONFIG_INVALID' | 'CONNECTOR_ERROR' | 'UNKNOWN';
}
export declare function isProdVerdictError(err: unknown): err is ProdVerdictError;
//# sourceMappingURL=types.d.ts.map