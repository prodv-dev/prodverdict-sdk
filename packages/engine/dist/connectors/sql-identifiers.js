/** Matches safe Postgres identifiers for table/column names from config */
const SQL_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
export function assertSqlIdentifier(value, label) {
    if (!SQL_IDENTIFIER.test(value)) {
        throw new Error(`Invalid SQL identifier for ${label}: "${value}". Use only letters, numbers, and underscores.`);
    }
}
export function assertSqlIdentifiers(values, labelPrefix) {
    for (const [key, value] of Object.entries(values)) {
        assertSqlIdentifier(value, `${labelPrefix}.${key}`);
    }
}
//# sourceMappingURL=sql-identifiers.js.map