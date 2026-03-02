import { existsSync, readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { Value } from '@sinclair/typebox/value';
import { GovernanceConfigSchema, type GovernanceConfig } from './schema.js';
import { DEFAULTS } from './defaults.js';

function getConfigPaths(): (string | undefined)[] {
  return [
    process.env['PI_RBAC_GOVERNANCE_CONFIG'],
    '.pi/governance.yaml',
    `${process.env['HOME']}/.pi/agent/governance.yaml`,
  ];
}

export function loadConfig(): { config: GovernanceConfig; source: string } {
  for (const path of getConfigPaths()) {
    if (path && existsSync(path)) {
      const raw = readFileSync(path, 'utf-8');
      const parsed = parseYaml(raw);

      const resolved = resolveEnvVars(parsed);

      const errors = [...Value.Errors(GovernanceConfigSchema, resolved)];
      if (errors.length > 0) {
        throw new ConfigValidationError(
          path,
          errors.map((e) => ({ path: e.path, message: e.message })),
        );
      }

      const config = Value.Default(GovernanceConfigSchema, resolved) as GovernanceConfig;
      return { config, source: path };
    }
  }

  return { config: DEFAULTS, source: 'built-in' };
}

function resolveEnvVars(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return obj.replace(/\$\{(\w+)\}/g, (_, name: string) => process.env[name] ?? '');
  }
  if (Array.isArray(obj)) return obj.map(resolveEnvVars);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, resolveEnvVars(v)]),
    );
  }
  return obj;
}

export class ConfigValidationError extends Error {
  constructor(path: string, errors: Array<{ path: string; message: string }>) {
    const details = errors.map((e) => `  ${e.path}: ${e.message}`).join('\n');
    super(`Invalid governance config at ${path}:\n${details}`);
    this.name = 'ConfigValidationError';
  }
}
