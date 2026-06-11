export interface RemoteMcpAuth {
    projectId: string;
    isPro: boolean;
    githubInstallationId: number | null;
}
export interface RemoteRunSummary {
    id: string;
    contract: string;
    verdict: string;
    evaluatedAt: string;
    source: string | null;
}
export interface RemoteRepoRef {
    owner: string;
    repo: string;
    ref?: string | undefined;
}
export interface RemoteMcpDeps {
    /** Resolve project from Bearer API key + project id header. */
    authenticate(apiKey: string, projectId: string): Promise<RemoteMcpAuth | null>;
    /** Materialize repo files (e.g. GitHub tarball). Keys are repo-relative paths. */
    fetchRepoFiles(auth: RemoteMcpAuth, repo: RemoteRepoRef): Promise<Record<string, string>>;
    /** Recent dashboard runs for authenticated project (Pro). */
    getRecentRuns(auth: RemoteMcpAuth, limit: number): Promise<RemoteRunSummary[]>;
}
//# sourceMappingURL=remote-types.d.ts.map