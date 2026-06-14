import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.next', '.nuxt', 'build', 'coverage']);

export function globToRegExp(pattern: string): RegExp {
  const normalized = pattern.replace(/\\/g, '/');
  const DIRGLOB = '<<DIRGLOB>>';
  const STARSTAR = '<<STARSTAR>>';
  let escaped = normalized.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  escaped = escaped
    .replace(/\*\*\//g, DIRGLOB)
    .replace(/\*\*/g, STARSTAR)
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replaceAll(DIRGLOB, '(?:[^/]+/)*')
    .replaceAll(STARSTAR, '.*');
  return new RegExp(`^${escaped}$`, 'i');
}

export function collectFilesByGlob(
  repoRoot: string,
  patterns: string[],
  extensions: Set<string>,
  skipDirs: Set<string> = DEFAULT_SKIP_DIRS,
): string[] {
  const regexes = patterns.map(globToRegExp);
  const files = new Set<string>();

  function walk(dir: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (skipDirs.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && extensions.has(path.extname(entry.name))) {
        if (/\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs|mts)$/i.test(entry.name)) continue;
        const rel = path.relative(repoRoot, full).replace(/\\/g, '/');
        if (regexes.some((re) => re.test(rel))) files.add(full);
      }
    }
  }

  walk(repoRoot);
  return [...files].sort();
}
