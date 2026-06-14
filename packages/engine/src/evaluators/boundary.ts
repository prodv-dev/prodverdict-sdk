import fs from 'node:fs';
import path from 'node:path';
import type { Finding } from '../types.js';
import type { BoundaryContractConfig } from '../config/schema.js';
import { collectFilesByGlob } from './repo-walk.js';

export interface BoundaryDataSources {
  repoRoot: string;
}

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts']);

function detectForbiddenWrite(content: string, field: string): boolean {
  const patterns = [
    new RegExp(`\\.\\.\\.\\s*(?:req\\.body|body|request\\.body|parsedBody|json)`, 'i'),
    new RegExp(`\\.(?:update|create|upsert|insert)\\s*\\(\\s*(?:req\\.body|body|request\\.body|parsedBody)`, 'i'),
    new RegExp(`['"]${field}['"]\\s*:`),
    new RegExp(`\\.${field}\\s*=`),
  ];
  return patterns.some((re) => re.test(content));
}

function detectForbiddenResponse(content: string, field: string): boolean {
  const patterns = [
    new RegExp(`['"]${field}['"]\\s*:`),
    new RegExp(`\\.${field}\\b`),
    new RegExp(`select\\s+[^;]*\\b${field}\\b`, 'i'),
  ];
  return patterns.some((re) => re.test(content));
}

export async function evaluateBoundary(
  cfg: BoundaryContractConfig,
  sources: BoundaryDataSources,
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const files = collectFilesByGlob(sources.repoRoot, cfg.scan_paths, SOURCE_EXTENSIONS);

  if (files.length === 0) {
    findings.push({
      contract: 'boundary',
      severity: 'low',
      entity: 'boundary:scan',
      message: `No source files matched scan_paths: ${cfg.scan_paths.join(', ')}`,
      fix: 'Adjust scan_paths in prodverdict.yml to include API route handlers.',
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
    const rel = path.relative(sources.repoRoot, filePath).replace(/\\/g, '/');

    for (const field of cfg.forbidden_write) {
      if (detectForbiddenWrite(content, field)) {
        findings.push({
          contract: 'boundary',
          severity: cfg.severity,
          entity: `endpoint:${rel}`,
          message: `${rel}: possible mass-assignment of forbidden writable field "${field}".`,
          fix:
            cfg.fix ??
            `Whitelist allowed fields; never spread req.body into ORM updates. Block "${field}" explicitly.`,
        });
      }
    }

    for (const field of cfg.forbidden_response) {
      if (detectForbiddenResponse(content, field)) {
        findings.push({
          contract: 'boundary',
          severity: cfg.severity,
          entity: `response:${rel}`,
          message: `${rel}: may expose forbidden response field "${field}".`,
          fix:
            cfg.fix ??
            `Remove "${field}" from API responses; use a DTO or select list that omits sensitive columns.`,
        });
      }
    }
  }

  return findings;
}
