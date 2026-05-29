export function isProdVerdictError(err) {
    return err instanceof Error && 'code' in err;
}
//# sourceMappingURL=types.js.map