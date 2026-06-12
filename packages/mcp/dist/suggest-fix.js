export function buildSuggestFixOutput(findings) {
    const fixes = findings
        .map((f) => f.fix)
        .filter((fix) => Boolean(fix));
    const unique = [...new Set(fixes)];
    return {
        fixes: unique,
        count: unique.length,
        note: 'Deterministic fix hints from contract definitions. Apply them and re-run check tools.',
    };
}
//# sourceMappingURL=suggest-fix.js.map