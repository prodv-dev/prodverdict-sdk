export async function uploadCheckResult(result, opts) {
    const base = opts.apiUrl.replace(/\/$/, '');
    const res = await fetch(`${base}/api/runs`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${opts.apiKey}`,
            'X-ProdVerdict-Project-Id': opts.projectId,
        },
        body: JSON.stringify({
            projectId: opts.projectId,
            contract: result.contract,
            verdict: result.verdict,
            findings: result.findings,
            evaluatedAt: result.evaluatedAt,
            source: opts.source,
        }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Upload failed (${res.status}): ${text}`);
    }
}
export function readUploadEnv() {
    const apiUrl = process.env.PRODVERDICT_API_URL;
    const apiKey = process.env.PRODVERDICT_API_KEY;
    const projectId = process.env.PRODVERDICT_PROJECT_ID;
    if (!apiUrl || !apiKey || !projectId)
        return null;
    return { apiUrl, apiKey, projectId };
}
//# sourceMappingURL=upload.js.map