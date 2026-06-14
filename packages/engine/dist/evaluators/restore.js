import { exec } from 'node:child_process';
import { promisify } from 'node:util';
const execAsync = promisify(exec);
function makeConnectorError(message) {
    const err = new Error(message);
    err.code = 'CONNECTOR_ERROR';
    return err;
}
function resolveEnv(cfg, env) {
    const resolved = { ...process.env };
    for (const [key, envVar] of Object.entries(cfg.command_env ?? {})) {
        const val = env[envVar];
        if (!val) {
            throw makeConnectorError(`Missing required env var "${envVar}" for restore contract (${key}).`);
        }
        resolved[key] = val;
    }
    return resolved;
}
async function defaultRunCommand(command, env) {
    try {
        await execAsync(command, {
            env: { ...process.env, ...env },
            timeout: 120_000,
            maxBuffer: 10 * 1024 * 1024,
        });
        return { exitCode: 0, stderr: '' };
    }
    catch (err) {
        const e = err;
        return { exitCode: typeof e.code === 'number' ? e.code : 1, stderr: e.stderr ?? String(err) };
    }
}
async function defaultRunQuery(query, env) {
    const dbUrl = env.DATABASE_URL ?? process.env.DATABASE_URL;
    if (!dbUrl) {
        throw makeConnectorError('DATABASE_URL required for restore smoke queries.');
    }
    const result = await defaultRunCommand(`psql "${dbUrl}" -t -c "${query.replace(/"/g, '\\"')}"`, env);
    return result.exitCode === 0;
}
export async function evaluateRestore(cfg, sources) {
    const findings = [];
    const runCommand = sources.runCommand ?? defaultRunCommand;
    const runQuery = sources.runQuery ?? defaultRunQuery;
    if (!cfg.backup_command?.trim()) {
        throw makeConnectorError('restore contract requires backup_command.');
    }
    if (!cfg.restore_command?.trim()) {
        throw makeConnectorError('restore contract requires restore_command.');
    }
    const resolvedEnv = resolveEnv(cfg, sources.env);
    const backup = await runCommand(cfg.backup_command, resolvedEnv);
    if (backup.exitCode !== 0) {
        findings.push({
            contract: 'restore',
            severity: cfg.severity,
            entity: 'restore:backup',
            message: `backup_command failed (exit ${backup.exitCode}).`,
            fix: cfg.fix ?? 'Fix backup_command or credentials; ensure pg_dump is available in CI.',
        });
        return findings;
    }
    const restore = await runCommand(cfg.restore_command, resolvedEnv);
    if (restore.exitCode !== 0) {
        findings.push({
            contract: 'restore',
            severity: cfg.severity,
            entity: 'restore:restore',
            message: `restore_command failed (exit ${restore.exitCode}).`,
            fix: cfg.fix ?? 'Fix restore_command; verify dump file path and pg_restore availability.',
        });
        return findings;
    }
    for (const query of cfg.smoke_queries) {
        const ok = await runQuery(query, resolvedEnv);
        if (!ok) {
            findings.push({
                contract: 'restore',
                severity: cfg.severity,
                entity: 'restore:smoke',
                message: `Smoke query failed: ${query}`,
                fix: 'Verify restored database contains expected data.',
            });
        }
    }
    return findings;
}
//# sourceMappingURL=restore.js.map