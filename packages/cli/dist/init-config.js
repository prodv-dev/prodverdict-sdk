import { writeFileSync, mkdirSync, readFileSync, existsSync, cpSync, } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMcpJson, buildRemoteMcpJson, writeMcpJsonFile } from './mcp-config.js';
import { buildProdverdictYaml, } from './stacks.js';
const __dirname = dirname(fileURLToPath(import.meta.url));
/** Skills copied into customer repos on bootstrap. */
export const CURSOR_SKILL_IDS = ['prodverdict-setup', 'prodverdict-verify'];
function assetsRoot() {
    const bundled = join(__dirname, '../bundled');
    if (existsSync(bundled))
        return bundled;
    return join(__dirname, '../../../examples');
}
function cursorRuleSource() {
    return join(assetsRoot(), 'cursor/prodverdict-agent.mdc');
}
function skillSource(skillId) {
    return join(assetsRoot(), 'skills', skillId, 'SKILL.md');
}
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
    const content = readFileSync(cursorRuleSource(), 'utf8');
    writeFileSync(path, content, 'utf8');
    return path;
}
export function writeCursorSkills(cwd, options) {
    const force = options?.force === true;
    const written = [];
    const skillsRoot = resolve(cwd, '.cursor/skills');
    mkdirSync(skillsRoot, { recursive: true });
    for (const skillId of CURSOR_SKILL_IDS) {
        const destDir = resolve(skillsRoot, skillId);
        const destPath = resolve(destDir, 'SKILL.md');
        if (existsSync(destPath) && !force)
            continue;
        const src = skillSource(skillId);
        if (!existsSync(src)) {
            throw new Error(`Missing bundled skill source: ${src}`);
        }
        mkdirSync(destDir, { recursive: true });
        cpSync(src, destPath);
        written.push(destPath);
    }
    return written;
}
//# sourceMappingURL=init-config.js.map