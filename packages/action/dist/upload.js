export async function uploadCheckResult(result, source) {
    const apiUrl = process.env.PRODVERDICT_API_URL;
    const apiKey = process.env.PRODVERDICT_API_KEY;
    const projectId = process.env.PRODVERDICT_PROJECT_ID;
    if (!apiUrl || !apiKey || !projectId)
        return;
    const base = apiUrl.replace(/\/$/, '');
    const res = await fetch(`${base}/api/runs`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'X-ProdVerdict-Project-Id': projectId,
        },
        body: JSON.stringify({
            projectId,
            contract: result.contract,
            verdict: result.verdict,
            findings: result.findings,
            evaluatedAt: result.evaluatedAt,
            source,
        }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`ProdVerdict upload failed (${res.status}): ${text}`);
    }
}
//# sourceMappingURL=upload.js.map