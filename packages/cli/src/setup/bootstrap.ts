import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  toAgentSetupOutput,
  type AgentSetupOutput,
  type SetupBootstrapInput,
} from '@prodverdict/engine';
import { resolveInitStack } from '../detect-stack.js';
import {
  writeInitConfig,
  writeMcpConfig,
  writeCursorRule,
  writeCursorSkills,
} from '../init-config.js';
import { isStackTemplate, STACK_META } from '../stacks.js';
import { buildScheduledWorkflow } from '../scheduled-cli.js';
import { runDoctorCli } from '../doctor-cli.js';
import {
  discoverEnvVars,
  applyEnvVars,
  mergeMcpEnv,
  missingEnvVars,
} from './env-discovery.js';

export interface BootstrapOptions {
  repoRoot?: string | undefined;
  stack?: string | undefined;
  output?: string | undefined;
  force?: boolean | undefined;
  skipWorkflow?: boolean | undefined;
  skipMcp?: boolean | undefined;
  skipCursorRule?: boolean | undefined;
  skipSkills?: boolean | undefined;
  fromEnv?: boolean | undefined;
}

export interface BootstrapResult extends SetupBootstrapInput {
  agent: AgentSetupOutput;
}

function shouldWrite(path: string, force: boolean): boolean {
  if (!existsSync(path)) return true;
  return force;
}

function installWorkflow(repoRoot: string, force: boolean): string | null {
  const wfPath = resolve(repoRoot, '.github/workflows/prodverdict-hourly.yml');
  if (!shouldWrite(wfPath, force)) return null;
  mkdirSync(resolve(repoRoot, '.github/workflows'), { recursive: true });
  writeFileSync(wfPath, buildScheduledWorkflow({ frequency: 'hourly' }), 'utf8');
  return wfPath;
}

export async function runSetupNonInteractive(
  opts: BootstrapOptions = {},
): Promise<BootstrapResult> {
  const repoRoot = resolve(opts.repoRoot ?? process.cwd());

  const { stack: resolvedStack } = await resolveInitStack(repoRoot, opts.stack);
  if (!isStackTemplate(resolvedStack)) {
    throw new Error(
      `Unknown stack "${resolvedStack}". Pass --stack explicitly. Run: prodverdict init --list-stacks`,
    );
  }
  const stack = resolvedStack;
  const meta = STACK_META[stack];
  const configPath = resolve(repoRoot, opts.output ?? 'prodverdict.yml');
  const force = opts.force === true;
  const filesWritten: string[] = [];
  let envWired: string[] = [];

  if (opts.fromEnv !== false) {
    const discovered = discoverEnvVars(repoRoot);
    envWired = applyEnvVars(discovered);
    if (Object.keys(discovered).length > 0) {
      const mcpPath = mergeMcpEnv(repoRoot, discovered);
      if (mcpPath && !filesWritten.includes(mcpPath)) {
        filesWritten.push(mcpPath);
      }
    }
  }

  const vars = discoverEnvVars(repoRoot);
  const missing = missingEnvVars(meta.billing, vars);

  if (shouldWrite(configPath, force)) {
    const written = writeInitConfig(repoRoot, stack, configPath);
    filesWritten.push(written);
  }

  if (!opts.skipWorkflow) {
    const wf = installWorkflow(repoRoot, force);
    if (wf) filesWritten.push(wf);
  }

  if (!opts.skipMcp) {
    const mcpPath = resolve(repoRoot, '.cursor/mcp.json');
    if (shouldWrite(mcpPath, force) || opts.fromEnv !== false) {
      const written = writeMcpConfig(repoRoot, stack);
      if (!filesWritten.includes(written)) filesWritten.push(written);
      if (opts.fromEnv !== false && Object.keys(vars).length > 0) {
        mergeMcpEnv(repoRoot, vars);
      }
    }
  }

  if (!opts.skipCursorRule) {
    const rulePath = resolve(repoRoot, '.cursor/rules/prodverdict-agent.mdc');
    if (shouldWrite(rulePath, force)) {
      const written = writeCursorRule(repoRoot);
      filesWritten.push(written);
    }
  }

  if (!opts.skipSkills) {
    const skillPaths = writeCursorSkills(repoRoot, { force });
    for (const p of skillPaths) {
      if (!filesWritten.includes(p)) filesWritten.push(p);
    }
  }

  let doctorOk = false;
  if (existsSync(configPath)) {
    try {
      const skipConnectivity = missing.length > 0;
      const { exitCode } = await runDoctorCli({
        config: configPath,
        format: 'text',
        skipConnectivity,
      });
      doctorOk = exitCode === 0;
    } catch {
      doctorOk = false;
    }
  }

  const input: SetupBootstrapInput = {
    stack,
    filesWritten,
    envWired: [...new Set(envWired)],
    missing,
    doctorOk,
  };

  return {
    ...input,
    agent: toAgentSetupOutput(input),
  };
}
