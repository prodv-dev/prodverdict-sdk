import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMcpJson, buildRemoteMcpJson, writeMcpJsonFile } from './mcp-config.js';
import { buildProdverdictYaml, } from './stacks.js';
const __dirname = dirname(fileURLToPath(import.meta.url));
const CURSOR_RULE_SOURCE = join(__dirname, '../../../examples/cursor/prodverdict-agent.mdc');
export function writeInitConfig(cwd, stack, outFile = 'prodverdict.yml', options) {
    const includeConfig = options?.includeConfig !== false;
    const path = resolve(cwd, outFile);
    const content = buildProdverdictYaml(stack, { includeConfig });
    writeFileSync(path, content, 'utf8');
    return path;
}
export function writeMcpConfig(cwd, stack) {
    return writeMcpJsonFile(cwd, buildMcpJson(stack));
}
export function writeRemoteMcpConfig(cwd, input) {
    return writeMcpJsonFile(cwd, buildRemoteMcpJson(input));
}
export function writeCursorRule(cwd) {
    const dir = resolve(cwd, '.cursor/rules');
    mkdirSync(dir, { recursive: true });
    const path = resolve(dir, 'prodverdict-agent.mdc');
    const content = readFileSync(CURSOR_RULE_SOURCE, 'utf8');
    writeFileSync(path, content, 'utf8');
    return path;
}
//# sourceMappingURL=init-config.js.map