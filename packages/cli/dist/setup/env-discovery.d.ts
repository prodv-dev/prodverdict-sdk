export declare const SETUP_ENV_VARS: readonly ["STRIPE_SECRET_KEY", "PADDLE_API_KEY", "PADDLE_ENVIRONMENT", "DATABASE_URL"];
export type SetupEnvVar = (typeof SETUP_ENV_VARS)[number];
/** Parse KEY=value lines from dotenv-style files (no multiline / export prefix). */
export declare function parseDotenvFile(content: string): Record<string, string>;
/** Read billing + DB vars from .env.local then .env (later files do not override earlier). */
export declare function discoverEnvVars(cwd: string): Record<string, string>;
export declare function redactEnvValue(key: string, value: string): string;
/** Apply discovered vars to process.env for doctor/check in same run. */
export declare function applyEnvVars(vars: Record<string, string>): string[];
/** Merge prodverdict server env in .cursor/mcp.json without clobbering other servers. */
export declare function mergeMcpEnv(cwd: string, vars: Record<string, string>): string | null;
export declare function missingEnvVars(provider: 'stripe' | 'paddle', vars: Record<string, string>): SetupEnvVar[];
//# sourceMappingURL=env-discovery.d.ts.map