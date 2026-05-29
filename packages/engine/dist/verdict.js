export function aggregateVerdict(findings) {
    if (findings.some((f) => f.severity === 'high'))
        return 'fail';
    if (findings.some((f) => f.severity === 'medium' || f.severity === 'low'))
        return 'warn';
    return 'pass';
}
//# sourceMappingURL=verdict.js.map