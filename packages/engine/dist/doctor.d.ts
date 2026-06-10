export type DoctorCheckStatus = 'pass' | 'fail' | 'skip';
export interface DoctorCheck {
    name: string;
    status: DoctorCheckStatus;
    message: string;
}
export interface DoctorResult {
    ok: boolean;
    checks: DoctorCheck[];
    contracts: Array<{
        type: string;
    }>;
}
export interface RunDoctorOptions {
    configPath: string;
    repoRoot?: string | undefined;
    /** When true, skip live Stripe/Paddle/Postgres connectivity pings */
    skipConnectivity?: boolean | undefined;
}
export declare function runDoctor(opts: RunDoctorOptions): Promise<DoctorResult>;
//# sourceMappingURL=doctor.d.ts.map