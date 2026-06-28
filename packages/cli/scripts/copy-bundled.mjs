#!/usr/bin/env node
/**
 * Copy core/examples/cursor and core/examples/skills into packages/cli/bundled/
 * for npm publish (init-config reads bundled assets at runtime).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_ROOT = path.resolve(__dirname, '..');
const CORE_ROOT = path.resolve(CLI_ROOT, '../..');
const BUNDLED = path.join(CLI_ROOT, 'bundled');

const SOURCES = [
  { from: path.join(CORE_ROOT, 'examples/cursor'), to: path.join(BUNDLED, 'cursor') },
  { from: path.join(CORE_ROOT, 'examples/skills'), to: path.join(BUNDLED, 'skills') },
];

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

fs.rmSync(BUNDLED, { recursive: true, force: true });
for (const { from, to } of SOURCES) {
  if (!fs.existsSync(from)) {
    console.error(`copy-bundled: missing source ${from}`);
    process.exit(1);
  }
  copyDir(from, to);
}
console.log('copy-bundled: wrote packages/cli/bundled/');
