import type { Command } from 'commander';
interface StatusRow {
    label: string;
    ok: boolean;
    detail: string;
    hint?: string | undefined;
}
export declare function buildStatus(repoRoot?: string): {
    rows: StatusRow[];
    configPath: string | null;
    contracts: string[] | null;
};
export declare function registerStatusCommand(program: Command): void;
export {};
//# sourceMappingURL=status-cli.d.ts.map