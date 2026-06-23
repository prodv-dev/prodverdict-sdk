const PRODVERDICT_ERROR_CODES = new Set([
    'CONFIG_INVALID',
    'CONNECTOR_ERROR',
    'UNKNOWN',
]);
export function isProdVerdictError(err) {
    return (err instanceof Error &&
        'code' in err &&
        typeof err.code === 'string' &&
        PRODVERDICT_ERROR_CODES.has(err.code));
}
//# sourceMappingURL=types.js.map