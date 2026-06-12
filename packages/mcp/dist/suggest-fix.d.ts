export type SuggestFixInput = {
    contract: string;
    severity: 'high' | 'medium' | 'low';
    entity: string;
    message: string;
    fix?: string | undefined;
};
export declare function buildSuggestFixOutput(findings: SuggestFixInput[]): {
    fixes: string[];
    count: number;
    note: string;
};
//# sourceMappingURL=suggest-fix.d.ts.map