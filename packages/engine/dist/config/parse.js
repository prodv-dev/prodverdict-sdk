import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { ProdVerdictConfigSchema } from './schema.js';
function makeConfigError(message) {
    const err = new Error(message);
    err.code = 'CONFIG_INVALID';
    return err;
}
export function validateConfig(raw) {
    const result = ProdVerdictConfigSchema.safeParse(raw);
    if (!result.success) {
        throw makeConfigError(formatZodError(result.error));
    }
    return result.data;
}
export function parseConfigFile(filePath) {
    let text;
    try {
        text = readFileSync(filePath, 'utf8');
    }
    catch (err) {
        throw makeConfigError(`Cannot read config file at "${filePath}": ${String(err)}`);
    }
    let raw;
    try {
        raw = parseYaml(text);
    }
    catch (err) {
        throw makeConfigError(`Failed to parse YAML in "${filePath}": ${String(err)}`);
    }
    return validateConfig(raw);
}
function formatZodError(err) {
    const lines = err.issues.map((issue) => {
        const path = issue.path.join('.') || '(root)';
        return `  ${path}: ${issue.message}`;
    });
    return `prodverdict.yml is invalid:\n${lines.join('\n')}`;
}
//# sourceMappingURL=parse.js.map