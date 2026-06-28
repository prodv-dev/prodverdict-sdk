export interface PostgresHelperResult {
    envVar: string;
    alreadySet: boolean;
}
/** Default table name per stack — mirrors what buildProdverdictYaml writes. */
export declare function usersTableForStack(stack: string): string;
/**
 * Print the read-only Postgres role SQL and wait for DATABASE_URL to be set.
 * If DATABASE_URL is already set in process.env, skip the wait.
 */
export declare function runPostgresRoleHelper(stack: string): Promise<PostgresHelperResult>;
//# sourceMappingURL=postgres-role-helper.d.ts.map