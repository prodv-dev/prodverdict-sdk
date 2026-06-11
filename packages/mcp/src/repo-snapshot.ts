import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

/** Write relative paths into a temp directory for engine filesystem scanners. */
export async function withRepoSnapshot<T>(
  files: Record<string, string>,
  fn: (repoRoot: string) => Promise<T>,
): Promise<T> {
  const root = await mkdtemp(join(tmpdir(), 'prodverdict-repo-'));
  try {
    for (const [relPath, content] of Object.entries(files)) {
      const normalized = relPath.replace(/\\/g, '/').replace(/^\//, '');
      const full = join(root, normalized);
      await mkdir(dirname(full), { recursive: true });
      await writeFile(full, content, 'utf8');
    }
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
