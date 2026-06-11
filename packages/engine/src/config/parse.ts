import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { ZodError } from 'zod';
import { ProdVerdictConfigSchema, type ProdVerdictConfig } from './schema.js';

function makeConfigError(message: string): Error & { code: 'CONFIG_INVALID' } {
  const err = new Error(message) as Error & { code: 'CONFIG_INVALID' };
  err.code = 'CONFIG_INVALID';
  return err;
}

export function validateConfig(raw: unknown): ProdVerdictConfig {
  const result = ProdVerdictConfigSchema.safeParse(raw);
  if (!result.success) {
    throw makeConfigError(formatZodError(result.error));
  }
  return result.data;
}

export function parseConfigYaml(text: string, label = 'prodverdict.yml'): ProdVerdictConfig {
  let raw: unknown;
  try {
    raw = parseYaml(text);
  } catch (err) {
    throw makeConfigError(`Failed to parse YAML in "${label}": ${String(err)}`);
  }
  return validateConfig(raw);
}

export function parseConfigFile(filePath: string): ProdVerdictConfig {
  let text: string;
  try {
    text = readFileSync(filePath, 'utf8');
  } catch (err) {
    throw makeConfigError(
      `Cannot read config file at "${filePath}": ${String(err)}`,
    );
  }
  return parseConfigYaml(text, filePath);
}

function formatZodError(err: ZodError): string {
  const lines = err.issues.map((issue) => {
    const path = issue.path.join('.') || '(root)';
    return `  ${path}: ${issue.message}`;
  });
  return `prodverdict.yml is invalid:\n${lines.join('\n')}`;
}
