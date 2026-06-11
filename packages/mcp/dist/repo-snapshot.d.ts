/** Write relative paths into a temp directory for engine filesystem scanners. */
export declare function withRepoSnapshot<T>(files: Record<string, string>, fn: (repoRoot: string) => Promise<T>): Promise<T>;
//# sourceMappingURL=repo-snapshot.d.ts.map