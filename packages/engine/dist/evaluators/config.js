import fs from 'node:fs';
import path from 'node:path';
/**
 * Scan JS/TS source files in the repo for environment variable references.
 * Returns all unique variable names referenced via process.env.X or import.meta.env.X.
 */
export function scanEnvReferences(repoRoot) {
    const referenced = new Set();
    const PROCESS_ENV_RE = /process\.env\.([A-Z][A-Z0-9_]*)/g;
    const META_ENV_RE = /import\.meta\.env\.([A-Z][A-Z0-9_]*)/g;
    const ENV_CALL_RE = /process\.env\['([A-Z][A-Z0-9_]*)'\]/g;
    const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts']);
    const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.next', '.nuxt', 'build', 'coverage']);
    function walk(dir) {
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            if (SKIP_DIRS.has(entry.name))
                continue;
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            }
            else if (entry.isFile() && SCAN_EXTENSIONS.has(path.extname(entry.name))) {
                // Skip test/spec files — they contain fixture env var names, not production usage
                if (/\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs|mts)$/i.test(entry.name))
                    continue;
                let content;
                try {
                    content = fs.readFileSync(fullPath, 'utf8');
                }
                catch {
                    continue;
                }
                for (const re of [PROCESS_ENV_RE, META_ENV_RE, ENV_CALL_RE]) {
                    re.lastIndex = 0;
                    let match;
                    while ((match = re.exec(content)) !== null) {
                        referenced.add(match[1]);
                    }
                }
            }
        }
    }
    walk(repoRoot);
    return referenced;
}
/**
 * Parse a .env or .env.example file into a map of key -> value (or empty string if no value).
 */
export function parseEnvFile(filePath) {
    const vars = new Map();
    let content;
    try {
        content = fs.readFileSync(filePath, 'utf8');
    }
    catch {
        return vars;
    }
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#'))
            continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) {
            vars.set(trimmed, '');
        }
        else {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
            if (key)
                vars.set(key, val);
        }
    }
    return vars;
}
const PLACEHOLDER_VALUES = new Set([
    '',
    'your_key_here',
    'your-key-here',
    'changeme',
    'change_me',
    'replace_me',
    'placeholder',
    'xxx',
    'todo',
    'fixme',
    'secret',
    'password',
    '123456',
    'localhost',
    'example',
]);
function isPlaceholder(value) {
    return PLACEHOLDER_VALUES.has(value.toLowerCase());
}
export async function evaluateConfig(cfg, sources) {
    const findings = [];
    const { repoRoot, env } = sources;
    // ── 1. Required vars must be set ────────────────────────────────────────────
    for (const rule of cfg.rules) {
        if (rule.type === 'required') {
            const { name, severity = cfg.severity, description } = rule;
            const value = env[name];
            if (value === undefined || value === '') {
                findings.push({
                    contract: 'config',
                    severity,
                    entity: `env:${name}`,
                    message: `Required environment variable "${name}" is not set.${description ? ` (${description})` : ''}`,
                    fix: `Set ${name} in your environment or CI secrets.`,
                });
            }
            else if (cfg.check_placeholders && isPlaceholder(value)) {
                findings.push({
                    contract: 'config',
                    severity: 'medium',
                    entity: `env:${name}`,
                    message: `Environment variable "${name}" appears to contain a placeholder value.`,
                    fix: `Replace the placeholder value of ${name} with a real secret.`,
                });
            }
        }
        if (rule.type === 'not_default') {
            const { name, forbidden_values, severity = cfg.severity } = rule;
            const value = env[name];
            if (value !== undefined && forbidden_values.some((f) => value === f || value.toLowerCase() === f.toLowerCase())) {
                findings.push({
                    contract: 'config',
                    severity,
                    entity: `env:${name}`,
                    message: `Environment variable "${name}" is set to a forbidden/default value.`,
                    fix: `Change ${name} from its default value before deploying to production.`,
                });
            }
        }
    }
    // ── 2. Scan repo for env var references and compare against .env.example ────
    if (cfg.scan_references) {
        const referencedVars = scanEnvReferences(repoRoot);
        // Load .env.example if it exists
        const examplePath = path.join(repoRoot, cfg.env_example_file ?? '.env.example');
        const exampleVars = parseEnvFile(examplePath);
        // Load .env if it exists (for local dev)
        const localEnvPath = path.join(repoRoot, '.env');
        const localEnvVars = parseEnvFile(localEnvPath);
        // Combine all "known" declared vars (example + local + current env)
        const knownVars = new Set([
            ...exampleVars.keys(),
            ...localEnvVars.keys(),
            ...Object.keys(env).filter((k) => env[k] !== undefined),
        ]);
        // Common infrastructure vars that are universally available and not worth warning about
        const ALWAYS_AVAILABLE = new Set([
            'NODE_ENV',
            'PORT',
            'HOST',
            'HOME',
            'PATH',
            'SHELL',
            'USER',
            'PWD',
            'CI',
            'GITHUB_ACTIONS',
            'VERCEL',
            'VERCEL_ENV',
            'VERCEL_URL',
            'NEXT_PUBLIC_VERCEL_URL',
        ]);
        for (const varName of referencedVars) {
            if (ALWAYS_AVAILABLE.has(varName))
                continue;
            if (!knownVars.has(varName) && !(cfg.ignore_vars ?? []).includes(varName)) {
                findings.push({
                    contract: 'config',
                    severity: 'low',
                    entity: `env:${varName}`,
                    message: `"${varName}" is referenced in source code but not declared in ${cfg.env_example_file ?? '.env.example'}.`,
                    fix: `Add ${varName} to ${cfg.env_example_file ?? '.env.example'} so all environments know about it.`,
                });
            }
        }
    }
    return findings;
}
//# sourceMappingURL=config.js.map