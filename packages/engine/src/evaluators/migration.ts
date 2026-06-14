import fs from 'node:fs';
import path from 'node:path';
import type { Finding } from '../types.js';
import type { MigrationContractConfig } from '../config/schema.js';
import { globToRegExp } from './repo-walk.js';

export interface MigrationDataSources {
  repoRoot: string;
}

interface MigrationRule {
  id: string;
  severity: MigrationContractConfig['severity'];
  test: (sql: string) => boolean;
  message: string;
  fix: string;
}

const RULES: Omit<MigrationRule, 'severity'>[] = [
  {
    id: 'create_index_non_concurrent',
    test: (sql) => /\bCREATE\s+(UNIQUE\s+)?INDEX\b/i.test(sql) && !/\bCONCURRENTLY\b/i.test(sql),
    message: 'CREATE INDEX without CONCURRENTLY can lock writes on large tables.',
    fix: 'Use CREATE INDEX CONCURRENTLY (two-step: create invalid index, then validate).',
  },
  {
    id: 'add_not_null_column',
    test: (sql) =>
      /\bALTER\s+TABLE\b[\s\S]*?\bADD\s+(?:COLUMN\s+)?\w+[\s\S]*?\bNOT\s+NULL\b/i.test(sql) &&
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

function stripComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--.*$/gm, ' ');
}

function collectMigrationFiles(repoRoot: string, patterns: string[]): string[] {
  const regexes = patterns.map(globToRegExp);
  const files = new Set<string>();
  const SKIP = new Set(['node_modules', '.git', 'dist', '.next']);

  function walk(dir: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (SKIP.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.sql')) {
        const rel = path.relative(repoRoot, full).replace(/\\/g, '/');
        if (regexes.some((re) => re.test(rel))) files.add(full);
      }
    }
  }

  walk(repoRoot);
  return [...files].sort();
}

export async function evaluateMigration(
  cfg: MigrationContractConfig,
  sources: MigrationDataSources,
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const defaultFix = cfg.fix;
  const severity = cfg.severity;
  const rules: MigrationRule[] = RULES.map((r) => ({ ...r, severity }));

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
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }
    const sql = stripComments(content);
    const rel = path.relative(sources.repoRoot, filePath).replace(/\\/g, '/');

    for (const rule of rules) {
      if (rule.test(sql)) {
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
