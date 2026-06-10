import { type DoctorResult, type AgentDoctorOutput } from '@prodverdict/engine';
export interface RunDoctorCliOptions {
    config: string;
    format: 'text' | 'json' | 'agent';
    repoRoot?: string | undefined;
    skipConnectivity?: boolean | undefined;
}
export declare function runDoctorCli(opts: RunDoctorCliOptions): Promise<{
    result: DoctorResult | AgentDoctorOutput;
    exitCode: number;
}>;
export declare function formatDoctorText(result: DoctorResult): string;
//# sourceMappingURL=doctor-cli.d.ts.map