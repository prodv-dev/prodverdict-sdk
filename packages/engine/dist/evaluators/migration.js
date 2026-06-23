import fs from 'node:fs';
import path from 'node:path';
import { globToRegExp } from './repo-walk.js';
const RULES = [
    {
        id: 'create_index_non_concurrent',
        test: (sql) => /\bCREATE\s+(UNIQUE\s+)?INDEX\b/i.test(sql) && !/\bCONCURRENTLY\b/i.test(sql),
        message: 'CREATE INDEX without CONCURRENTLY can lock writes on large tables.',
        fix: 'Use CREATE INDEX CONCURRENTLY (two-step: create invalid index, then validate).',
    },
    {
        id: 'add_not_null_column',
        test: (sql) => /\bALTER\s+TABLE\b[\s\S]*?\bADD\s+(?:COLUMN\s+)?\w+[\s\S]*?\bNOT\s+NULL\b/i.test(sql) &&
            !/\bDEFAULT\b/i.test(sql),
        message: 'ADD COLUMN NOT NULL without DEFAULT forces a full table rewrite.',
        fix: 'Add nullable column, backfill, then SET NOT NULL in a follow-up migration.',
    },
    {
        id: 'set_not_null',
        test: (sql) => /\bALTER\s+TABLE\b[\s\S]*?\bSET\s+NOT\s+NULL\b/i.test(sql),
        message: 'SET NOT NULL validates every row and can lock the table.',
        fix: 'Backfill nulls first; add constraint NOT VALID then validate.',
    },
    {
        id: 'drop_table',
        test: (sql) => /\bDROP\s+TABLE\b/i.test(sql),
        message: 'DROP TABLE is destructive and irreversible.',
        fix: 'Confirm intent; use soft-delete or rename-first pattern in production.',
    },
    {
        id: 'truncate',
        test: (sql) => /\bTRUNCATE\b/i.test(sql),
        message: 'TRUNCATE acquires ACCESS EXCLUSIVE lock.',
        fix: 'Batch DELETE or archive data instead of TRUNCATE on hot tables.',
    },
    {
        id: 'vacuum_full',
        test: (sql) => /\bVACUUM\s+FULL\b/i.test(sql),
        message: 'VACUUM FULL rewrites the table and blocks concurrent access.',
        fix: 'Use standard VACUUM or pg_repack for online maintenance.',
    },
];
function stripComments(sql) {
    return sql
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/--.*$/gm, ' ');
}
/**
 * Split a SQL string into individual statements on top-level semicolons,
 * respecting single/double quotes and dollar-quoted bodies ($tag$ ... $tag$).
 *
 * Rules with negative look-aheads (e.g. CREATE INDEX without CONCURRENTLY,
 * ADD COLUMN NOT NULL without DEFAULT) must be evaluated per statement —
 * otherwise a safe statement elsewhere in the same file would mask an unsafe one.
 */
export function splitSqlStatements(sql) {
    const statements = [];
    let current = '';
    let inSingle = false;
    let inDouble = false;
    let dollarTag = null;
    for (let i = 0; i < sql.length; i++) {
        const ch = sql[i];
        if (dollarTag) {
            if (ch === '$' && sql.startsWith(dollarTag, i)) {
                current += dollarTag;
                i += dollarTag.length - 1;
                dollarTag = null;
                continue;
            }
            current += ch;
            continue;
        }
        if (inSingle) {
            current += ch;
            if (ch === "'")
                inSingle = false;
            continue;
        }
        if (inDouble) {
            current += ch;
            if (ch === '"')
                inDouble = false;
            continue;
        }
        if (ch === "'") {
            inSingle = true;
            current += ch;
            continue;
        }
        if (ch === '"') {
            inDouble = true;
            current += ch;
            continue;
        }
        if (ch === '$') {
            const tag = /^\$[A-Za-z0-9_]*\$/.exec(sql.slice(i))?.[0];
            if (tag) {
                dollarTag = tag;
                current += tag;
                i += tag.length - 1;
                continue;
            }
        }
        if (ch === ';') {
            statements.push(current);
            current = '';
            continue;
        }
        current += ch;
    }
    if (current.trim())
        statements.push(current);
    return statements.filter((s) => s.trim().length > 0);
}
function collectMigrationFiles(repoRoot, patterns) {
    const regexes = patterns.map(globToRegExp);
    const files = new Set();
    const SKIP = new Set(['node_modules', '.git', 'dist', '.next']);
    function walk(dir) {
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            if (SKIP.has(entry.name))
                continue;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(full);
            }
            else if (entry.isFile() && entry.name.endsWith('.sql')) {
                const rel = path.relative(repoRoot, full).replace(/\\/g, '/');
                if (regexes.some((re) => re.test(rel)))
                    files.add(full);
            }
        }
    }
    walk(repoRoot);
    return [...files].sort();
}
export async function evaluateMigration(cfg, sources) {
    const findings = [];
    const defaultFix = cfg.fix;
    const severity = cfg.severity;
    const rules = RULES.map((r) => ({ ...r, severity }));
    const files = collectMigrationFiles(sources.repoRoot, cfg.paths);
    if (files.length === 0) {
        findings.push({
            contract: 'migration',
            severity: 'low',
            entity: 'migrations:none',
            message: `No .sql migration files matched paths: ${cfg.paths.join(', ')}`,
            fix: 'Add migration paths to prodverdict.yml or add SQL migrations to the repo.',
        });
        return findings;
    }
    for (const filePath of files) {
        let content;
        try {
            content = fs.readFileSync(filePath, 'utf8');
        }
        catch {
            continue;
        }
        const sql = stripComments(content);
        const statements = splitSqlStatements(sql);
        const rel = path.relative(sources.repoRoot, filePath).replace(/\\/g, '/');
        for (const rule of rules) {
            // Evaluate each rule per statement so a safe statement (e.g. one using
            // CONCURRENTLY or DEFAULT) cannot mask an unsafe statement in the same
            // file. At most one finding per rule per file to avoid duplicate noise.
            if (statements.some((stmt) => rule.test(stmt))) {
                findings.push({
                    contract: 'migration',
                    severity: rule.severity,
                    entity: `migration:${rel}`,
                    message: `${rel}: ${rule.message}`,
                    fix: defaultFix ?? rule.fix,
                });
            }
        }
    }
    return findings;
}
//# sourceMappingURL=migration.js.map