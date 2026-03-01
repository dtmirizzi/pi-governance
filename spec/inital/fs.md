# Functional Specification: `@grwnd/pi-governance`

## Governance, RBAC, Audit, and Human-in-the-Loop for Pi-based Coding Agents

**Version:** 1.0  
**Author:** Grwnd AI  
**Date:** March 1, 2026  
**Status:** Draft — Ready for Engineering Planning  
**Companion Document:** PRD v1.0 (pi-governance-prd.md)

---

## 1. Purpose & Scope

This document specifies the functional behavior of every component in `@grwnd/pi-governance`. It is written to be consumed by an AI coding agent (Claude Code) for implementation planning. Every interface, data structure, algorithm, configuration format, error condition, and test requirement is defined here.

The PRD defines _what_ and _why_. This document defines _how_.

---

## 2. System Context

### 2.1 Pi Extension API (As Understood)

Pi extensions are TypeScript modules that hook into the agent lifecycle. The extension API provides the following hooks that `pi-governance` will use:

```typescript
interface PiExtension {
  name: string;

  // Called once when the agent session begins
  onSessionStart?(ctx: ExtensionContext): Promise<void>;

  // Called before every tool invocation — return the tool call to proceed,
  // return a modified tool call, or return null to block
  onBeforeToolCall?(toolCall: ToolCall, ctx: ExtensionContext): Promise<ToolCall | null>;

  // Called after every tool invocation — can modify the result before
  // it's sent back to the model
  onAfterToolCall?(
    toolCall: ToolCall,
    result: ToolResult,
    ctx: ExtensionContext,
  ): Promise<ToolResult>;

  // Called when the agent session ends
  onSessionEnd?(ctx: ExtensionContext): Promise<void>;
}

interface ToolCall {
  tool: 'read' | 'write' | 'edit' | 'bash';
  params: Record<string, unknown>;
  // For bash: params.command (string)
  // For read/write/edit: params.path (string), params.content (string for write)
}

interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
}

interface ExtensionContext {
  sessionId: string;
  // Methods for interacting with the Pi session:
  setPromptTemplate?(templatePath: string): void;
  ui?: {
    confirm?(message: string): Promise<boolean>;
    print?(message: string): void;
  };
  // Session metadata that may be available:
  metadata?: Record<string, unknown>;
}
```

**Important:** The exact Pi extension API may differ from the above. Implementation must consult Pi's actual TypeScript types at build time. The above is our best understanding and the contract we're building against. If the actual API differs, the adapter pattern in section 4.1 will bridge the gap.

### 2.2 Pi's Four Tools

Pi provides exactly four tools to the model:

| Tool    | Parameters                               | Risk Level                                 |
| ------- | ---------------------------------------- | ------------------------------------------ |
| `read`  | `path: string`                           | Low — reads file contents                  |
| `write` | `path: string, content: string`          | Medium — creates/overwrites files          |
| `edit`  | `path: string, old: string, new: string` | Medium — modifies files                    |
| `bash`  | `command: string`                        | **Critical** — arbitrary command execution |

### 2.3 Package Manifest

```json
{
  "name": "@grwnd/pi-governance",
  "version": "0.1.0",
  "description": "Governance, RBAC, audit, and HITL for Pi-based coding agents",
  "keywords": ["pi-package", "governance", "rbac", "audit"],
  "license": "Apache-2.0",
  "main": "dist/extensions/index.js",
  "types": "dist/extensions/index.d.ts",
  "pi": {
    "extensions": ["./dist/extensions"],
    "skills": ["./skills"],
    "prompts": ["./prompts"]
  },
  "scripts": {
    "build": "tsup src --format esm,cjs --dts",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src/ test/",
    "format": "prettier --write .",
    "docs:dev": "vitepress dev docs",
    "docs:build": "vitepress build docs",
    "prepare": "husky"
  },
  "peerDependencies": {
    "@mariozechner/pi-coding-agent": ">=0.50.0"
  },
  "dependencies": {
    "yaml": "^2.0.0",
    "@sinclair/typebox": "^0.33.0",
    "minimatch": "^9.0.0"
  },
  "optionalDependencies": {
    "oso": "^0.27.0"
  },
  "devDependencies": {
    "vitest": "^2.0.0",
    "@vitest/coverage-v8": "^2.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.5.0",
    "eslint": "^9.0.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "prettier": "^3.3.0",
    "husky": "^9.0.0",
    "lint-staged": "^15.0.0",
    "vitepress": "^1.4.0"
  }
}
```

---

## 3. Configuration System

### 3.1 Config File Resolution

The extension resolves config from the following locations, in order of precedence (highest first):

1. Path specified in `GRWND_GOVERNANCE_CONFIG` environment variable
2. `.pi/governance.yaml` in the current working directory (project-local)
3. `~/.pi/agent/governance.yaml` (user-global)
4. Built-in defaults (embedded in the package)

If multiple files exist, they are **not merged** — the highest-precedence file wins entirely. This is a deliberate simplicity choice; merging introduces ambiguity.

### 3.2 Config Schema (Typebox)

```typescript
// lib/config/schema.ts
import { Type, Static } from '@sinclair/typebox';

const AuthEnvConfig = Type.Object({
  user_var: Type.String({ default: 'GRWND_USER' }),
  role_var: Type.String({ default: 'GRWND_ROLE' }),
  org_unit_var: Type.String({ default: 'GRWND_ORG_UNIT' }),
});

const AuthLocalConfig = Type.Object({
  users_file: Type.String({ default: './users.yaml' }),
});

const AuthConfig = Type.Object({
  provider: Type.Union([Type.Literal('env'), Type.Literal('local'), Type.Literal('oidc')], {
    default: 'env',
  }),
  env: Type.Optional(AuthEnvConfig),
  local: Type.Optional(AuthLocalConfig),
});

const YamlPolicyConfig = Type.Object({
  rules_file: Type.String({ default: './governance-rules.yaml' }),
});

const OsoPolicyConfig = Type.Object({
  polar_files: Type.Array(Type.String(), {
    default: ['./policies/base.polar', './policies/tools.polar'],
  }),
});

const PolicyConfig = Type.Object({
  engine: Type.Union([Type.Literal('yaml'), Type.Literal('oso')], { default: 'yaml' }),
  yaml: Type.Optional(YamlPolicyConfig),
  oso: Type.Optional(OsoPolicyConfig),
});

const TemplatesConfig = Type.Object({
  directory: Type.String({ default: './templates/' }),
  default: Type.String({ default: 'project-lead' }),
});

const HitlWebhookConfig = Type.Object({
  url: Type.String(),
});

const HitlConfig = Type.Object({
  default_mode: Type.Union(
    [Type.Literal('autonomous'), Type.Literal('supervised'), Type.Literal('dry_run')],
    { default: 'supervised' },
  ),
  approval_channel: Type.Union([Type.Literal('cli'), Type.Literal('webhook')], { default: 'cli' }),
  timeout_seconds: Type.Number({ default: 300, minimum: 10, maximum: 3600 }),
  webhook: Type.Optional(HitlWebhookConfig),
});

const JsonlSinkConfig = Type.Object({
  type: Type.Literal('jsonl'),
  path: Type.String({ default: '~/.pi/agent/audit.jsonl' }),
});

const WebhookSinkConfig = Type.Object({
  type: Type.Literal('webhook'),
  url: Type.String(),
});

const PostgresSinkConfig = Type.Object({
  type: Type.Literal('postgres'),
  connection: Type.String(),
});

const AuditSinkConfig = Type.Union([JsonlSinkConfig, WebhookSinkConfig, PostgresSinkConfig]);

const AuditConfig = Type.Object({
  sinks: Type.Array(AuditSinkConfig, {
    default: [{ type: 'jsonl', path: '~/.pi/agent/audit.jsonl' }],
  }),
});

const OrgUnitOverride = Type.Object({
  hitl: Type.Optional(Type.Partial(HitlConfig)),
  policy: Type.Optional(
    Type.Object({
      extra_polar: Type.Optional(Type.String()),
      extra_rules: Type.Optional(Type.String()),
    }),
  ),
});

export const GovernanceConfigSchema = Type.Object({
  auth: Type.Optional(AuthConfig),
  policy: Type.Optional(PolicyConfig),
  templates: Type.Optional(TemplatesConfig),
  hitl: Type.Optional(HitlConfig),
  audit: Type.Optional(AuditConfig),
  org_units: Type.Optional(Type.Record(Type.String(), OrgUnitOverride)),
});

export type GovernanceConfig = Static<typeof GovernanceConfigSchema>;
```

### 3.3 Config Loader

```typescript
// lib/config/loader.ts
import { existsSync, readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { Value } from '@sinclair/typebox/value';
import { GovernanceConfigSchema, GovernanceConfig } from './schema';
import { DEFAULTS } from './defaults';

const CONFIG_PATHS = [
  process.env.GRWND_GOVERNANCE_CONFIG,
  '.pi/governance.yaml',
  `${process.env.HOME}/.pi/agent/governance.yaml`,
];

export function loadConfig(): { config: GovernanceConfig; source: string } {
  for (const path of CONFIG_PATHS) {
    if (path && existsSync(path)) {
      const raw = readFileSync(path, 'utf-8');
      const parsed = parseYaml(raw);

      // Resolve environment variable references (${VAR_NAME})
      const resolved = resolveEnvVars(parsed);

      // Validate against schema
      const errors = [...Value.Errors(GovernanceConfigSchema, resolved)];
      if (errors.length > 0) {
        throw new ConfigValidationError(path, errors);
      }

      // Apply defaults for missing fields
      const config = Value.Default(GovernanceConfigSchema, resolved) as GovernanceConfig;
      return { config, source: path };
    }
  }

  // No config file found — use built-in defaults
  return { config: DEFAULTS, source: 'built-in' };
}

function resolveEnvVars(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return obj.replace(/\$\{(\w+)\}/g, (_, name) => process.env[name] ?? '');
  }
  if (Array.isArray(obj)) return obj.map(resolveEnvVars);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, resolveEnvVars(v)]));
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
```

### 3.4 Environment Variable Substitution

Config values containing `${VAR_NAME}` are resolved from environment variables at load time. If the variable is not set, it resolves to an empty string. This is used for sensitive values like webhook URLs and database connection strings.

---

## 4. Extension Entrypoint

### 4.1 Main Extension Module

```typescript
// extensions/index.ts
import type { PiExtension } from '@mariozechner/pi-coding-agent';
import { loadConfig } from '../lib/config/loader';
import { createPolicyEngine } from '../lib/policy/factory';
import { createIdentityChain } from '../lib/identity/chain';
import { AuditLogger } from '../lib/audit/logger';
import { createApprovalFlow } from '../lib/hitl/approval';
import { TemplateSelector } from '../lib/templates/selector';
import { BashClassifier } from '../lib/bash/classifier';

export default function piGovernance(): PiExtension {
  // Stateful — these are initialized in onSessionStart and used across hooks
  let policyEngine: PolicyEngine;
  let audit: AuditLogger;
  let approvalFlow: ApprovalFlow;
  let templateSelector: TemplateSelector;
  let bashClassifier: BashClassifier;
  let resolvedIdentity: ResolvedIdentity;
  let sessionStartTime: number;
  let toolCallCount = 0;
  let denialCount = 0;

  return {
    name: 'grwnd-pi-governance',

    async onSessionStart(ctx) {
      sessionStartTime = Date.now();

      // 1. Load config
      const { config, source } = loadConfig();

      // 2. Resolve identity
      const identityChain = createIdentityChain(config.auth);
      resolvedIdentity = await identityChain.resolve();

      // 3. Initialize policy engine
      policyEngine = await createPolicyEngine(config.policy, config.org_units);

      // 4. Initialize audit logger
      audit = new AuditLogger(config.audit);

      // 5. Initialize approval flow
      approvalFlow = createApprovalFlow(config.hitl, resolvedIdentity, ctx);

      // 6. Initialize template selector
      templateSelector = new TemplateSelector(config.templates);

      // 7. Initialize bash classifier
      bashClassifier = new BashClassifier(policyEngine.getBashOverrides(resolvedIdentity.role));

      // 8. Select and inject prompt template
      const templateName = policyEngine.getTemplateName(resolvedIdentity.role);
      const templatePath = templateSelector.resolve(templateName);
      if (ctx.setPromptTemplate) {
        ctx.setPromptTemplate(templatePath);
      }

      // 9. Log session start
      await audit.log({
        event: 'session_start',
        timestamp: new Date().toISOString(),
        sessionId: ctx.sessionId,
        userId: resolvedIdentity.userId,
        role: resolvedIdentity.role,
        orgUnit: resolvedIdentity.orgUnit,
        configSource: source,
        policyEngine: config.policy?.engine ?? 'yaml',
        executionMode: policyEngine.getExecutionMode(resolvedIdentity.role),
        templateName,
      });

      // 10. Print governance status to user
      if (ctx.ui?.print) {
        ctx.ui.print(
          `🔒 Governance active | ${resolvedIdentity.userId} | ` +
            `${resolvedIdentity.role}@${resolvedIdentity.orgUnit} | ` +
            `mode: ${policyEngine.getExecutionMode(resolvedIdentity.role)}`,
        );
      }
    },

    async onBeforeToolCall(toolCall, ctx) {
      toolCallCount++;

      const { role, orgUnit, userId } = resolvedIdentity;
      const executionMode = policyEngine.getExecutionMode(role);

      // === DRY RUN MODE ===
      if (executionMode === 'dry_run') {
        await audit.log({
          event: 'tool_dry_run',
          timestamp: new Date().toISOString(),
          sessionId: ctx.sessionId,
          userId,
          role,
          orgUnit,
          tool: toolCall.tool,
          params: summarizeParams(toolCall),
        });
        // Block execution, return informative message
        return null; // TODO: return ToolResult with dry-run explanation
      }

      // === TOOL-LEVEL PERMISSION CHECK ===
      const toolDecision = policyEngine.evaluateTool(role, toolCall.tool);
      if (toolDecision === 'deny') {
        denialCount++;
        await audit.log({
          event: 'tool_denied',
          timestamp: new Date().toISOString(),
          sessionId: ctx.sessionId,
          userId,
          role,
          orgUnit,
          tool: toolCall.tool,
          params: summarizeParams(toolCall),
          reason: 'tool_not_allowed_for_role',
        });
        return null;
      }

      // === BASH COMMAND CLASSIFICATION ===
      if (toolCall.tool === 'bash') {
        const command = (toolCall.params as { command: string }).command;
        const bashDecision = bashClassifier.classify(command);

        if (bashDecision === 'dangerous') {
          denialCount++;
          await audit.log({
            event: 'bash_denied',
            timestamp: new Date().toISOString(),
            sessionId: ctx.sessionId,
            userId,
            role,
            orgUnit,
            tool: 'bash',
            command: command.substring(0, 500), // truncate for audit
            classification: 'dangerous',
            reason: 'bash_command_blocked',
          });
          return null;
        }

        // needs_review commands go through HITL if in supervised mode
        if (bashDecision === 'needs_review' && executionMode === 'supervised') {
          // Fall through to HITL check below
        }
      }

      // === PATH PERMISSION CHECK (write, edit, read) ===
      if (['write', 'edit', 'read'].includes(toolCall.tool)) {
        const path = (toolCall.params as { path: string }).path;
        const operation = toolCall.tool === 'read' ? 'read' : 'write';
        const pathDecision = policyEngine.evaluatePath(role, orgUnit, operation, path);

        if (pathDecision === 'deny') {
          denialCount++;
          await audit.log({
            event: 'path_denied',
            timestamp: new Date().toISOString(),
            sessionId: ctx.sessionId,
            userId,
            role,
            orgUnit,
            tool: toolCall.tool,
            path,
            reason: 'path_not_allowed',
          });
          return null;
        }
      }

      // === HUMAN-IN-THE-LOOP APPROVAL ===
      const approvalRequired = policyEngine.requiresApproval(role, toolCall.tool);
      if (approvalRequired) {
        await audit.log({
          event: 'approval_requested',
          timestamp: new Date().toISOString(),
          sessionId: ctx.sessionId,
          userId,
          role,
          orgUnit,
          tool: toolCall.tool,
          params: summarizeParams(toolCall),
        });

        const approved = await approvalFlow.requestApproval(toolCall);

        if (!approved) {
          denialCount++;
          await audit.log({
            event: 'approval_denied',
            timestamp: new Date().toISOString(),
            sessionId: ctx.sessionId,
            userId,
            role,
            orgUnit,
            tool: toolCall.tool,
            params: summarizeParams(toolCall),
          });
          return null;
        }

        await audit.log({
          event: 'approval_granted',
          timestamp: new Date().toISOString(),
          sessionId: ctx.sessionId,
          userId,
          role,
          orgUnit,
          tool: toolCall.tool,
        });
      }

      // === ALLOW ===
      await audit.log({
        event: 'tool_allowed',
        timestamp: new Date().toISOString(),
        sessionId: ctx.sessionId,
        userId,
        role,
        orgUnit,
        tool: toolCall.tool,
        params: summarizeParams(toolCall),
      });

      return toolCall;
    },

    async onAfterToolCall(toolCall, result, ctx) {
      await audit.log({
        event: 'tool_result',
        timestamp: new Date().toISOString(),
        sessionId: ctx.sessionId,
        userId: resolvedIdentity.userId,
        role: resolvedIdentity.role,
        orgUnit: resolvedIdentity.orgUnit,
        tool: toolCall.tool,
        success: result.success,
        outputLength: result.output?.length ?? 0,
        error: result.error?.substring(0, 200),
      });

      return result;
    },

    async onSessionEnd(ctx) {
      const sessionDuration = Date.now() - sessionStartTime;

      await audit.log({
        event: 'session_end',
        timestamp: new Date().toISOString(),
        sessionId: ctx.sessionId,
        userId: resolvedIdentity.userId,
        role: resolvedIdentity.role,
        orgUnit: resolvedIdentity.orgUnit,
        toolCallCount,
        denialCount,
        sessionDurationMs: sessionDuration,
      });

      await audit.flush();
    },
  };
}

function summarizeParams(toolCall: ToolCall): Record<string, unknown> {
  const params = toolCall.params as Record<string, unknown>;
  const summary: Record<string, unknown> = { tool: toolCall.tool };

  if (toolCall.tool === 'bash') {
    summary.command = (params.command as string)?.substring(0, 500);
  } else if (params.path) {
    summary.path = params.path;
    if (params.content) {
      summary.contentLength = (params.content as string).length;
    }
  }

  return summary;
}
```

---

## 5. Policy Engine

### 5.1 PolicyEngine Interface

```typescript
// lib/policy/engine.ts

export type PolicyDecision = 'allow' | 'deny' | 'needs_approval';
export type PathOperation = 'read' | 'write';
export type ExecutionMode = 'autonomous' | 'supervised' | 'dry_run';

export interface PolicyEngine {
  /**
   * Evaluate whether a role is allowed to invoke a specific tool.
   */
  evaluateTool(role: string, tool: string): PolicyDecision;

  /**
   * Evaluate whether a role is allowed to access a file path.
   * orgUnit is used for multi-tenant data boundary enforcement.
   */
  evaluatePath(
    role: string,
    orgUnit: string,
    operation: PathOperation,
    path: string,
  ): PolicyDecision;

  /**
   * Determine whether a tool call requires human approval for this role.
   */
  requiresApproval(role: string, tool: string): boolean;

  /**
   * Get the execution mode for a role (autonomous, supervised, dry_run).
   */
  getExecutionMode(role: string): ExecutionMode;

  /**
   * Get the prompt template name for a role.
   */
  getTemplateName(role: string): string;

  /**
   * Get bash classifier overrides for a role (additional blocked/allowed patterns).
   */
  getBashOverrides(role: string): BashOverrides;

  /**
   * Get the daily token budget for a role. Returns -1 for unlimited.
   */
  getTokenBudget(role: string): number;
}

export interface BashOverrides {
  additionalBlocked?: RegExp[];
  additionalAllowed?: RegExp[];
}
```

### 5.2 YAML Policy Engine Implementation

```typescript
// lib/policy/yaml-engine.ts

import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { minimatch } from 'minimatch';
import type {
  PolicyEngine,
  PolicyDecision,
  PathOperation,
  ExecutionMode,
  BashOverrides,
} from './engine';

interface YamlRole {
  allowed_tools: string[];
  blocked_tools: string[];
  prompt_template: string;
  execution_mode: ExecutionMode;
  human_approval: {
    required_for: string[];
    auto_approve?: string[];
  };
  token_budget_daily: number;
  allowed_paths: string[];
  blocked_paths: string[];
  bash_overrides?: {
    additional_blocked?: string[];
    additional_allowed?: string[];
  };
}

interface YamlRules {
  roles: Record<string, YamlRole>;
}

export class YamlPolicyEngine implements PolicyEngine {
  private rules: YamlRules;

  constructor(rulesFilePath: string) {
    const raw = readFileSync(rulesFilePath, 'utf-8');
    this.rules = parseYaml(raw) as YamlRules;
  }

  private getRole(role: string): YamlRole {
    const r = this.rules.roles[role];
    if (!r) {
      throw new Error(
        `Unknown role: ${role}. Available roles: ${Object.keys(this.rules.roles).join(', ')}`,
      );
    }
    return r;
  }

  evaluateTool(role: string, tool: string): PolicyDecision {
    const r = this.getRole(role);

    // Check blocked list first
    if (r.blocked_tools.includes(tool)) return 'deny';

    // Check allowed list
    if (r.allowed_tools.includes('all') || r.allowed_tools.includes(tool)) {
      return 'allow';
    }

    // Not in either list — deny by default
    return 'deny';
  }

  evaluatePath(
    role: string,
    orgUnit: string,
    operation: PathOperation,
    path: string,
  ): PolicyDecision {
    const r = this.getRole(role);

    // Check blocked paths first (takes precedence)
    for (const pattern of r.blocked_paths) {
      if (minimatch(path, pattern, { dot: true })) {
        return 'deny';
      }
    }

    // Check allowed paths
    for (const pattern of r.allowed_paths) {
      const resolved = pattern.replace('{{project_path}}', process.cwd());
      if (minimatch(path, resolved, { dot: true })) {
        return 'allow';
      }
    }

    // Not in allowed paths — deny
    return 'deny';
  }

  requiresApproval(role: string, tool: string): boolean {
    const r = this.getRole(role);

    // Auto-approve takes precedence
    if (r.human_approval.auto_approve?.includes(tool)) return false;

    // Check required list
    if (r.human_approval.required_for.includes('all')) return true;
    return r.human_approval.required_for.includes(tool);
  }

  getExecutionMode(role: string): ExecutionMode {
    return this.getRole(role).execution_mode;
  }

  getTemplateName(role: string): string {
    return this.getRole(role).prompt_template;
  }

  getBashOverrides(role: string): BashOverrides {
    const r = this.getRole(role);
    const overrides = r.bash_overrides;
    if (!overrides) return {};

    return {
      additionalBlocked: overrides.additional_blocked?.map((p) => new RegExp(p)),
      additionalAllowed: overrides.additional_allowed?.map((p) => new RegExp(p)),
    };
  }

  getTokenBudget(role: string): number {
    return this.getRole(role).token_budget_daily;
  }
}
```

### 5.3 Oso/Polar Policy Engine Implementation

```typescript
// lib/policy/oso-engine.ts

import type {
  PolicyEngine,
  PolicyDecision,
  PathOperation,
  ExecutionMode,
  BashOverrides,
} from './engine';

// Dynamic import so oso is truly optional
let Oso: any;

export class OsoPolicyEngine implements PolicyEngine {
  private oso: any;
  private roleConfigs: Map<string, any> = new Map();

  static async create(polarFiles: string[], factStore: FactStore): Promise<OsoPolicyEngine> {
    // Dynamic import — fails gracefully if oso is not installed
    try {
      const osoModule = await import('oso');
      Oso = osoModule.Oso;
    } catch {
      throw new Error(
        'oso package is not installed. Install it with: npm install oso\n' +
          'Or switch to the YAML policy engine: policy.engine: yaml',
      );
    }

    const engine = new OsoPolicyEngine();
    engine.oso = new Oso();

    // Register classes
    engine.oso.registerClass(User);
    engine.oso.registerClass(Tool);
    engine.oso.registerClass(FilePath);
    engine.oso.registerClass(AgentSession);

    // Load policy files
    for (const file of polarFiles) {
      await engine.oso.loadFiles([file]);
    }

    // Load facts from fact store
    const roles = await factStore.getAllRoleBindings();
    for (const binding of roles) {
      engine.roleConfigs.set(binding.role, binding.config);
    }

    return engine;
  }

  evaluateTool(role: string, tool: string): PolicyDecision {
    const user = new User(role);
    const toolResource = new Tool(tool);

    if (this.oso.isAllowed(user, 'invoke', toolResource)) {
      return 'allow';
    }
    return 'deny';
  }

  evaluatePath(
    role: string,
    orgUnit: string,
    operation: PathOperation,
    path: string,
  ): PolicyDecision {
    const user = new User(role, orgUnit);
    const filePath = new FilePath(path, orgUnit);

    if (this.oso.isAllowed(user, operation, filePath)) {
      return 'allow';
    }
    return 'deny';
  }

  requiresApproval(role: string, tool: string): boolean {
    const user = new User(role);
    const session = new AgentSession();
    return !this.oso.isAllowed(user, 'auto_approve', new Tool(tool));
  }

  getExecutionMode(role: string): ExecutionMode {
    const config = this.roleConfigs.get(role);
    return config?.execution_mode ?? 'supervised';
  }

  getTemplateName(role: string): string {
    const config = this.roleConfigs.get(role);
    return config?.prompt_template ?? 'project-lead';
  }

  getBashOverrides(role: string): BashOverrides {
    const config = this.roleConfigs.get(role);
    if (!config?.bash_overrides) return {};
    return {
      additionalBlocked: config.bash_overrides.additional_blocked?.map(
        (p: string) => new RegExp(p),
      ),
      additionalAllowed: config.bash_overrides.additional_allowed?.map(
        (p: string) => new RegExp(p),
      ),
    };
  }

  getTokenBudget(role: string): number {
    const config = this.roleConfigs.get(role);
    return config?.token_budget_daily ?? -1;
  }
}

// Oso resource classes
class User {
  constructor(
    public role: string,
    public orgUnit?: string,
  ) {}
}

class Tool {
  constructor(
    public name: string,
    public orgUnit?: string,
  ) {}
}

class FilePath {
  constructor(
    public path: string,
    public orgUnit: string,
  ) {}
}

class AgentSession {
  constructor() {}
}
```

### 5.4 Default Polar Policies

```polar
# policies/base.polar

# Actor model
actor User {}

# Resources
resource Tool {
  permissions = ["invoke", "auto_approve"];
  roles = ["analyst", "project_lead", "admin", "auditor"];
}

resource FilePath {
  permissions = ["read", "write"];
  roles = ["analyst", "project_lead", "admin", "auditor"];
}

resource AgentSession {
  permissions = ["run_autonomous", "run_supervised", "run_dry"];
  roles = ["analyst", "project_lead", "admin", "auditor"];
}

# --- Analyst policies ---

has_permission(user: User, "invoke", tool: Tool) if
  user.role = "analyst" and
  tool.name in ["read"];

has_permission(user: User, "read", path: FilePath) if
  user.role = "analyst" and
  user.orgUnit = path.orgUnit;

has_permission(user: User, "run_supervised", _session: AgentSession) if
  user.role = "analyst";

# --- Project Lead policies ---

has_permission(user: User, "invoke", tool: Tool) if
  user.role = "project_lead" and
  tool.name in ["read", "write", "edit", "bash"];

has_permission(user: User, "auto_approve", tool: Tool) if
  user.role = "project_lead" and
  tool.name in ["read", "edit"];

has_permission(user: User, "read", path: FilePath) if
  user.role = "project_lead" and
  user.orgUnit = path.orgUnit;

has_permission(user: User, "write", path: FilePath) if
  user.role = "project_lead" and
  user.orgUnit = path.orgUnit;

has_permission(user: User, "run_supervised", _session: AgentSession) if
  user.role = "project_lead";

# --- Admin policies ---

has_permission(_user: User, "invoke", _tool: Tool) if
  _user.role = "admin";

has_permission(_user: User, "auto_approve", _tool: Tool) if
  _user.role = "admin";

has_permission(_user: User, "read", _path: FilePath) if
  _user.role = "admin";

has_permission(_user: User, "write", _path: FilePath) if
  _user.role = "admin";

has_permission(user: User, "run_autonomous", _session: AgentSession) if
  user.role = "admin";

# --- Auditor policies ---

has_permission(user: User, "invoke", tool: Tool) if
  user.role = "auditor" and
  tool.name = "read";

has_permission(user: User, "read", _path: FilePath) if
  user.role = "auditor";

has_permission(user: User, "run_dry", _session: AgentSession) if
  user.role = "auditor";
```

### 5.5 Policy Engine Factory

```typescript
// lib/policy/factory.ts

import type { PolicyEngine } from './engine';
import { YamlPolicyEngine } from './yaml-engine';

export async function createPolicyEngine(
  config: PolicyConfig,
  orgUnits?: Record<string, OrgUnitOverride>,
): Promise<PolicyEngine> {
  const engine = config?.engine ?? 'yaml';

  if (engine === 'yaml') {
    const rulesFile = config?.yaml?.rules_file ?? './governance-rules.yaml';
    return new YamlPolicyEngine(rulesFile);
  }

  if (engine === 'oso') {
    // Dynamic import — only loaded if oso engine is selected
    const { OsoPolicyEngine } = await import('./oso-engine');
    const { OsoMemoryFactStore } = await import('../facts/oso-memory-store');

    const polarFiles = config?.oso?.polar_files ?? [
      './policies/base.polar',
      './policies/tools.polar',
    ];

    const factStore = new OsoMemoryFactStore();
    // TODO: load facts from org_units config
    return OsoPolicyEngine.create(polarFiles, factStore);
  }

  throw new Error(`Unknown policy engine: ${engine}. Must be 'yaml' or 'oso'.`);
}
```

---

## 6. Identity Resolution

### 6.1 Interface

```typescript
// lib/identity/provider.ts

export interface ResolvedIdentity {
  userId: string;
  role: string;
  orgUnit: string;
  source: string; // which provider resolved this identity
}

export interface IdentityProvider {
  name: string;

  /**
   * Attempt to resolve the current user's identity.
   * Returns null if this provider cannot resolve identity.
   */
  resolve(): Promise<ResolvedIdentity | null>;
}
```

### 6.2 Environment Variable Provider

```typescript
// lib/identity/env-provider.ts

export class EnvIdentityProvider implements IdentityProvider {
  name = 'env';

  constructor(
    private userVar: string = 'GRWND_USER',
    private roleVar: string = 'GRWND_ROLE',
    private orgUnitVar: string = 'GRWND_ORG_UNIT',
  ) {}

  async resolve(): Promise<ResolvedIdentity | null> {
    const userId = process.env[this.userVar];
    const role = process.env[this.roleVar];
    const orgUnit = process.env[this.orgUnitVar];

    if (!userId || !role) return null;

    return {
      userId,
      role,
      orgUnit: orgUnit ?? 'default',
      source: 'env',
    };
  }
}
```

### 6.3 Local File Provider

```typescript
// lib/identity/local-provider.ts

import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { execSync } from 'child_process';

interface UserEntry {
  role: string;
  org_unit?: string;
}

export class LocalIdentityProvider implements IdentityProvider {
  name = 'local';
  private users: Record<string, UserEntry>;

  constructor(usersFilePath: string) {
    const raw = readFileSync(usersFilePath, 'utf-8');
    this.users = parseYaml(raw) as Record<string, UserEntry>;
  }

  async resolve(): Promise<ResolvedIdentity | null> {
    // Try to determine the current system username
    const username = process.env.USER || process.env.USERNAME;
    if (!username) return null;

    const entry = this.users[username];
    if (!entry) return null;

    return {
      userId: username,
      role: entry.role,
      orgUnit: entry.org_unit ?? 'default',
      source: 'local',
    };
  }
}
```

### 6.4 Identity Chain

```typescript
// lib/identity/chain.ts

import type { IdentityProvider, ResolvedIdentity } from './provider';
import { EnvIdentityProvider } from './env-provider';
import { LocalIdentityProvider } from './local-provider';

export class IdentityChain {
  private providers: IdentityProvider[];

  constructor(providers: IdentityProvider[]) {
    this.providers = providers;
  }

  async resolve(): Promise<ResolvedIdentity> {
    for (const provider of this.providers) {
      const identity = await provider.resolve();
      if (identity) return identity;
    }

    // Fallback: default restricted identity
    return {
      userId: 'unknown',
      role: 'analyst', // most restrictive role by default
      orgUnit: 'default',
      source: 'fallback',
    };
  }
}

export function createIdentityChain(config?: AuthConfig): IdentityChain {
  const providers: IdentityProvider[] = [];

  // Always try env first (fastest, works in CI)
  providers.push(
    new EnvIdentityProvider(
      config?.env?.user_var,
      config?.env?.role_var,
      config?.env?.org_unit_var,
    ),
  );

  // Then try local file if configured
  if (config?.provider === 'local' && config.local?.users_file) {
    try {
      providers.push(new LocalIdentityProvider(config.local.users_file));
    } catch {
      // users file not found — skip this provider
    }
  }

  return new IdentityChain(providers);
}
```

---

## 7. Bash Command Classifier

### 7.1 Classification Categories

| Category       | Behavior                                                    | Examples                                            |
| -------------- | ----------------------------------------------------------- | --------------------------------------------------- |
| `safe`         | Auto-allow (no HITL needed)                                 | `ls`, `cat`, `grep`, `find`, `git status`, `pwd`    |
| `dangerous`    | Always deny, regardless of role                             | `rm -rf`, `sudo`, `curl \| sh`, `dd of=`, `mkfs`    |
| `needs_review` | Passes to HITL if in supervised mode; allowed in autonomous | Any command not matching safe or dangerous patterns |

### 7.2 Default Patterns

```typescript
// lib/bash/patterns.ts

export const SAFE_PATTERNS: RegExp[] = [
  // File viewing
  /^(cat|head|tail|less|more)\s/,
  /^(file|stat|wc|md5sum|sha256sum)\s/,

  // Directory listing
  /^(ls|ll|la|tree|du|df)\b/,
  /^(pwd|cd)\b/,

  // Searching
  /^(grep|rg|ag|ack|find|fd|locate)\s/,
  /^(which|whereis|type|command)\s/,

  // Text processing (read-only)
  /^(sort|uniq|cut|awk|sed)\s.*(?!-i)/, // sed without -i (in-place)
  /^(tr|diff|comm|join|paste)\s/,
  /^(jq|yq|xmlstarlet)\s/,

  // Git (read-only operations)
  /^git\s+(log|status|diff|show|blame|branch|tag|remote|stash list)\b/,
  /^git\s+(ls-files|ls-tree|rev-parse|describe)\b/,

  // System info
  /^(whoami|id|groups|uname|hostname|date|uptime|env|printenv)\b/,
  /^(echo|printf)\s/,

  // Package info (not install)
  /^(npm|yarn|pnpm)\s+(list|ls|info|show|view|outdated|audit)\b/,
  /^pip\s+(list|show|freeze)\b/,
  /^(node|python|ruby|go)\s+--version\b/,
  /^(node|python|ruby)\s+-e\s/,

  // Networking (read-only)
  /^(ping|dig|nslookup|host|traceroute|tracepath)\s/,
  /^curl\s.*--head\b/,
  /^curl\s.*-I\b/,
];

export const DANGEROUS_PATTERNS: RegExp[] = [
  // Destructive file operations
  /\brm\s+(-[a-zA-Z]*r|-[a-zA-Z]*f|--recursive|--force)\b/,
  /\brm\s+-[a-zA-Z]*rf\b/,
  /\bshred\b/,

  // Privilege escalation
  /\bsudo\b/,
  /\bsu\s+-?\s*\w/,
  /\bdoas\b/,

  // Permission/ownership changes
  /\bchmod\b/,
  /\bchown\b/,
  /\bchgrp\b/,

  // Disk/partition operations
  /\bdd\b.*\bof=/,
  /\bmkfs\b/,
  /\bfdisk\b/,
  /\bparted\b/,
  /\bmount\b/,
  /\bumount\b/,

  // Remote code execution
  /\bcurl\b.*\|\s*(bash|sh|zsh|python|perl|ruby)\b/,
  /\bwget\b.*\|\s*(bash|sh|zsh|python|perl|ruby)\b/,
  /\bcurl\b.*>\s*.*\.sh\s*&&/,

  // Remote access
  /\bssh\b/,
  /\bscp\b/,
  /\brsync\b.*:\//,
  /\bnc\s+(-[a-zA-Z]*l|-[a-zA-Z]*p|--listen)\b/,
  /\bncat\b/,
  /\bsocat\b/,
  /\btelnet\b/,

  // System modification
  /\bsystemctl\s+(start|stop|restart|enable|disable)\b/,
  /\bservice\s+\w+\s+(start|stop|restart)\b/,
  /\biptables\b/,
  /\bufw\b/,
  /\bfirewall-cmd\b/,

  // Package installation (can run arbitrary post-install scripts)
  /\bnpm\s+(install|i|add|ci)\b/,
  /\byarn\s+(add|install)\b/,
  /\bpnpm\s+(add|install|i)\b/,
  /\bpip\s+install\b/,
  /\bapt(-get)?\s+install\b/,
  /\bbrew\s+install\b/,
  /\bcargo\s+install\b/,

  // Environment variable manipulation (can leak secrets)
  /\bexport\b.*\b(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)\b/i,

  // Cron / scheduled tasks
  /\bcrontab\b/,
  /\bat\s+/,

  // Container escape vectors
  /\bdocker\s+(run|exec|build|push|pull)\b/,
  /\bkubectl\s+(exec|run|apply|delete)\b/,

  // Process manipulation
  /\bkill\b/,
  /\bkillall\b/,
  /\bpkill\b/,

  // History manipulation
  /\bhistory\s+-c\b/,
  /\bunset\s+HISTFILE\b/,

  // Compiler/build (can execute arbitrary code)
  /\bmake\s/,
  /\bgcc\b/,
  /\bg\+\+\b/,
];
```

### 7.3 Classifier Implementation

```typescript
// lib/bash/classifier.ts

import { SAFE_PATTERNS, DANGEROUS_PATTERNS } from './patterns';
import type { BashOverrides } from '../policy/engine';

export type BashClassification = 'safe' | 'dangerous' | 'needs_review';

export class BashClassifier {
  private safePatterns: RegExp[];
  private dangerousPatterns: RegExp[];

  constructor(overrides?: BashOverrides) {
    this.safePatterns = [...SAFE_PATTERNS, ...(overrides?.additionalAllowed ?? [])];
    this.dangerousPatterns = [...DANGEROUS_PATTERNS, ...(overrides?.additionalBlocked ?? [])];
  }

  classify(command: string): BashClassification {
    const trimmed = command.trim();

    // Multi-command detection: if the command contains pipes, semicolons,
    // or && / ||, classify each segment independently and return the
    // most restrictive classification
    const segments = this.splitCommand(trimmed);

    if (segments.length > 1) {
      const classifications = segments.map((s) => this.classifySingle(s));
      if (classifications.includes('dangerous')) return 'dangerous';
      if (classifications.includes('needs_review')) return 'needs_review';
      return 'safe';
    }

    return this.classifySingle(trimmed);
  }

  private classifySingle(command: string): BashClassification {
    const trimmed = command.trim();

    // Check dangerous first (takes precedence)
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(trimmed)) return 'dangerous';
    }

    // Check safe
    for (const pattern of this.safePatterns) {
      if (pattern.test(trimmed)) return 'safe';
    }

    // Default: needs review
    return 'needs_review';
  }

  private splitCommand(command: string): string[] {
    // Split on pipes, semicolons, && and || while respecting quotes
    // This is a simplified parser — not a full shell parser
    const segments: string[] = [];
    let current = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let escaped = false;

    for (let i = 0; i < command.length; i++) {
      const char = command[i];

      if (escaped) {
        current += char;
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        current += char;
        continue;
      }

      if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
        current += char;
        continue;
      }

      if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
        current += char;
        continue;
      }

      if (!inSingleQuote && !inDoubleQuote) {
        if (char === '|' && command[i + 1] !== '|') {
          segments.push(current.trim());
          current = '';
          continue;
        }
        if (char === ';') {
          segments.push(current.trim());
          current = '';
          continue;
        }
        if (char === '&' && command[i + 1] === '&') {
          segments.push(current.trim());
          current = '';
          i++; // skip second &
          continue;
        }
        if (char === '|' && command[i + 1] === '|') {
          segments.push(current.trim());
          current = '';
          i++; // skip second |
          continue;
        }
      }

      current += char;
    }

    if (current.trim()) segments.push(current.trim());
    return segments.filter((s) => s.length > 0);
  }
}
```

---

## 8. FactStore Interface

### 8.1 Interface

```typescript
// lib/facts/store.ts

export interface RoleBinding {
  userId: string;
  role: string;
  orgUnit: string;
  config?: Record<string, unknown>; // Role-level config (template, bash overrides, etc.)
}

export interface Relation {
  subject: string;
  predicate: string;
  object: string;
}

export interface FactStore {
  /**
   * Get all role bindings for a user.
   */
  getRoles(userId: string): Promise<RoleBinding[]>;

  /**
   * Get all role bindings across all users.
   */
  getAllRoleBindings(): Promise<RoleBinding[]>;

  /**
   * Get relations for a resource (for Oso relationship-based access control).
   */
  getRelations(resource: string): Promise<Relation[]>;

  /**
   * Bulk sync facts into the store. Used for initial load and reconciliation.
   */
  sync(bindings: RoleBinding[], relations?: Relation[]): Promise<void>;

  /**
   * Optional: watch for changes (for hot-reload scenarios).
   */
  watch?(onChange: () => void): void;
}
```

### 8.2 YAML FactStore Implementation

Reads role bindings from the governance-rules.yaml `roles` section and the users.yaml file.

### 8.3 OsoMemory FactStore Implementation

Loads facts into Oso's in-memory store at session start. Facts are ephemeral — they exist for the duration of the Pi session and are reloaded from the config files on next session start.

---

## 9. Audit System

### 9.1 Audit Record Schema

```typescript
// lib/audit/schema.ts

export interface AuditRecord {
  timestamp: string; // ISO 8601
  event: AuditEventType;
  sessionId: string;
  userId: string;
  role: string;
  orgUnit: string;

  // Tool-call specific fields (present when event relates to a tool call)
  tool?: string;
  params?: Record<string, unknown>; // summarized, never full file contents
  command?: string; // bash command (truncated to 500 chars)
  path?: string; // file path for read/write/edit
  classification?: string; // bash classification result
  reason?: string; // denial reason

  // Result fields (present for tool_result events)
  success?: boolean;
  outputLength?: number;
  error?: string; // truncated to 200 chars

  // Session-level fields (present for session_start/end events)
  configSource?: string;
  policyEngine?: string;
  executionMode?: string;
  templateName?: string;
  toolCallCount?: number;
  denialCount?: number;
  sessionDurationMs?: number;
}

export type AuditEventType =
  | 'session_start'
  | 'session_end'
  | 'tool_allowed'
  | 'tool_denied'
  | 'tool_dry_run'
  | 'tool_result'
  | 'bash_denied'
  | 'path_denied'
  | 'approval_requested'
  | 'approval_granted'
  | 'approval_denied';
```

### 9.2 AuditSink Interface

```typescript
// lib/audit/sinks/sink.ts

export interface AuditSink {
  name: string;
  write(record: AuditRecord): Promise<void>;
  flush(): Promise<void>;
}
```

### 9.3 JSONL Sink

```typescript
// lib/audit/sinks/jsonl.ts

import { appendFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export class JsonlAuditSink implements AuditSink {
  name = 'jsonl';
  private buffer: string[] = [];
  private path: string;

  constructor(path: string) {
    this.path = path.replace(/^~/, process.env.HOME ?? '');
    mkdirSync(dirname(this.path), { recursive: true });
  }

  async write(record: AuditRecord): Promise<void> {
    this.buffer.push(JSON.stringify(record));

    // Flush every 10 records or on explicit flush
    if (this.buffer.length >= 10) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const lines = this.buffer.join('\n') + '\n';
    this.buffer = [];
    appendFileSync(this.path, lines, 'utf-8');
  }
}
```

### 9.4 Webhook Sink

```typescript
// lib/audit/sinks/webhook.ts

export class WebhookAuditSink implements AuditSink {
  name = 'webhook';
  private buffer: AuditRecord[] = [];
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  async write(record: AuditRecord): Promise<void> {
    this.buffer.push(record);
    if (this.buffer.length >= 10) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const batch = [...this.buffer];
    this.buffer = [];

    try {
      await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: batch }),
      });
    } catch (error) {
      // Don't lose records on network failure — re-buffer
      this.buffer.unshift(...batch);
      console.error(`[pi-governance] Webhook audit sink failed: ${error}`);
    }
  }
}
```

### 9.5 AuditLogger (Multi-Sink)

```typescript
// lib/audit/logger.ts

import type { AuditRecord } from './schema';
import type { AuditSink } from './sinks/sink';
import { JsonlAuditSink } from './sinks/jsonl';
import { WebhookAuditSink } from './sinks/webhook';

export class AuditLogger {
  private sinks: AuditSink[];

  constructor(config: AuditConfig) {
    this.sinks = (config?.sinks ?? []).map((sinkConfig) => {
      switch (sinkConfig.type) {
        case 'jsonl':
          return new JsonlAuditSink(sinkConfig.path);
        case 'webhook':
          return new WebhookAuditSink(sinkConfig.url);
        case 'postgres':
          // Dynamic import for optional postgres dependency
          // TODO: implement in Phase 3
          throw new Error('Postgres audit sink not yet implemented');
        default:
          throw new Error(`Unknown audit sink type: ${(sinkConfig as any).type}`);
      }
    });

    // If no sinks configured, default to JSONL
    if (this.sinks.length === 0) {
      this.sinks.push(new JsonlAuditSink('~/.pi/agent/audit.jsonl'));
    }
  }

  async log(record: Partial<AuditRecord> & { event: string; timestamp: string }): Promise<void> {
    const fullRecord = record as AuditRecord;
    await Promise.all(this.sinks.map((sink) => sink.write(fullRecord)));
  }

  async flush(): Promise<void> {
    await Promise.all(this.sinks.map((sink) => sink.flush()));
  }
}
```

---

## 10. Human-in-the-Loop (HITL) Approval

### 10.1 Approval Flow Interface

```typescript
// lib/hitl/approval.ts

export interface ApprovalFlow {
  requestApproval(toolCall: ToolCall): Promise<boolean>;
}
```

### 10.2 CLI Approver

```typescript
// lib/hitl/cli-approver.ts

export class CliApprover implements ApprovalFlow {
  private ctx: ExtensionContext;
  private timeoutSeconds: number;

  constructor(ctx: ExtensionContext, timeoutSeconds: number = 300) {
    this.ctx = ctx;
    this.timeoutSeconds = timeoutSeconds;
  }

  async requestApproval(toolCall: ToolCall): Promise<boolean> {
    const description = this.describeToolCall(toolCall);

    // Use Pi's built-in confirm if available
    if (this.ctx.ui?.confirm) {
      return this.ctx.ui.confirm(`🔒 Governance: Approve tool call?\n${description}`);
    }

    // Fallback: print to console and wait for input
    // This is for environments where Pi's UI methods aren't available
    if (this.ctx.ui?.print) {
      this.ctx.ui.print(`🔒 Governance: Approval required for:\n${description}`);
      this.ctx.ui.print(`Approve? (y/n) — auto-deny in ${this.timeoutSeconds}s`);
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, this.timeoutSeconds * 1000);

      // In a real implementation, this would read from stdin or
      // use Pi's interactive prompt mechanism
      // For now, auto-deny on timeout
      process.stdin.once('data', (data) => {
        clearTimeout(timeout);
        const answer = data.toString().trim().toLowerCase();
        resolve(answer === 'y' || answer === 'yes');
      });
    });
  }

  private describeToolCall(toolCall: ToolCall): string {
    const params = toolCall.params as Record<string, unknown>;
    switch (toolCall.tool) {
      case 'bash':
        return `  Tool: bash\n  Command: ${params.command}`;
      case 'write':
        return `  Tool: write\n  Path: ${params.path}\n  Content length: ${(params.content as string)?.length ?? 0} chars`;
      case 'edit':
        return `  Tool: edit\n  Path: ${params.path}`;
      case 'read':
        return `  Tool: read\n  Path: ${params.path}`;
      default:
        return `  Tool: ${toolCall.tool}\n  Params: ${JSON.stringify(params).substring(0, 200)}`;
    }
  }
}
```

### 10.3 Webhook Approver

```typescript
// lib/hitl/webhook-approver.ts

export class WebhookApprover implements ApprovalFlow {
  private url: string;
  private timeoutSeconds: number;

  constructor(url: string, timeoutSeconds: number = 300) {
    this.url = url;
    this.timeoutSeconds = timeoutSeconds;
  }

  async requestApproval(toolCall: ToolCall): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutSeconds * 1000);

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'approval_request',
          toolCall: {
            tool: toolCall.tool,
            params: summarizeParams(toolCall),
          },
          timestamp: new Date().toISOString(),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) return false;
      const result = await response.json();
      return result.approved === true;
    } catch {
      clearTimeout(timeout);
      return false; // Default deny on timeout or error
    }
  }
}
```

### 10.4 Approval Flow Factory

```typescript
// lib/hitl/approval.ts

export function createApprovalFlow(
  config: HitlConfig | undefined,
  identity: ResolvedIdentity,
  ctx: ExtensionContext,
): ApprovalFlow {
  const channel = config?.approval_channel ?? 'cli';
  const timeout = config?.timeout_seconds ?? 300;

  switch (channel) {
    case 'cli':
      return new CliApprover(ctx, timeout);
    case 'webhook':
      if (!config?.webhook?.url) {
        throw new Error('HITL webhook URL not configured');
      }
      return new WebhookApprover(config.webhook.url, timeout);
    default:
      throw new Error(`Unknown approval channel: ${channel}`);
  }
}
```

---

## 11. Prompt Template System

### 11.1 Template Selector

```typescript
// lib/templates/selector.ts

import { existsSync } from 'fs';
import { join, resolve } from 'path';

export class TemplateSelector {
  private userDirectory: string;
  private bundledDirectory: string;

  constructor(config?: TemplatesConfig) {
    this.userDirectory = config?.directory ?? './templates/';
    this.bundledDirectory = resolve(__dirname, '../../prompts');
  }

  /**
   * Resolve a template name to a file path.
   * User templates take precedence over bundled templates.
   */
  resolve(templateName: string): string {
    // Check user directory first
    const userPath = join(this.userDirectory, `${templateName}.md`);
    if (existsSync(userPath)) return userPath;

    // Fall back to bundled templates
    const bundledPath = join(this.bundledDirectory, `${templateName}.md`);
    if (existsSync(bundledPath)) return bundledPath;

    throw new Error(
      `Prompt template '${templateName}' not found. ` + `Searched: ${userPath}, ${bundledPath}`,
    );
  }
}
```

### 11.2 Template Renderer

```typescript
// lib/templates/renderer.ts

import { readFileSync } from 'fs';

interface TemplateVariables {
  org_unit: string;
  role_name: string;
  project_path: string;
  allowed_paths: string[];
  allowed_tools: string[];
  execution_mode: string;
  [key: string]: unknown;
}

export function renderTemplate(templatePath: string, variables: TemplateVariables): string {
  let content = readFileSync(templatePath, 'utf-8');

  // Replace {{variable}} patterns
  content = content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key];
    if (value === undefined) return match; // leave unreplaced if no value
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
  });

  return content;
}
```

### 11.3 Bundled Prompt Templates

**prompts/analyst.md:**

```markdown
You are Pi, a coding assistant operating under RESTRICTED governance policy.

## Your Constraints

- You may READ files within the allowed project paths
- You do NOT have permission to: write files, edit files, execute bash commands
- You are scoped to the {{org_unit}} organization unit
- Allowed paths: {{allowed_paths}}

## When You Hit a Boundary

If a user asks you to do something outside your permissions, explain that the
action requires elevated permissions and suggest they contact their admin.
Do not attempt to find workarounds for policy restrictions.

## Audit Notice

All interactions are logged for compliance purposes.
```

**prompts/project-lead.md:**

```markdown
You are Pi, a coding assistant operating under STANDARD governance policy.

## Your Capabilities

- You may read, write, and edit files within: {{allowed_paths}}
- You may run bash commands, but destructive operations require human approval
- You are operating within the {{org_unit}} organization unit

## Data Boundaries

Cross-unit data access is prohibited. Do not read, reference, or interact with
data belonging to other organization units.

## Audit Notice

All tool invocations are logged for compliance purposes.
```

**prompts/admin.md:**

```markdown
You are Pi, a coding assistant operating with FULL access.

## Your Capabilities

- All tools are available: read, write, edit, bash
- No human approval required for tool calls
- Full filesystem access

## Audit Notice

All tool invocations are logged for compliance purposes.
```

**prompts/dry-run.md:**

```markdown
You are Pi, a coding assistant operating in OBSERVATION mode.

## Mode: Dry Run

- You may analyze, plan, and suggest actions
- NO tool calls will be executed — everything is logged for review
- Treat this session as a planning exercise

## Instructions

When you would normally execute a tool call, describe what you would do
and why. The governance system will log your intended actions for review.
```

---

## 12. Slash Commands

### 12.1 `/governance status`

**Behavior:** Displays the current governance state to the user.

**Output format:**

```
🔒 Governance Status
━━━━━━━━━━━━━━━━━━━
User:            dtaylor
Role:            project_lead
Org Unit:        cornerstone_aec
Policy Engine:   yaml
Execution Mode:  supervised
Template:        project-lead
Config Source:    .pi/governance.yaml

Session Stats:
  Tool calls:    12
  Denied:        2
  Approved:      3 (human approval)
  Duration:      4m 32s
```

### 12.2 `/governance setup`

**Behavior:** Interactive wizard that creates a governance config file. Prompts for identity provider, username, org unit, role, audit path. Writes to `~/.pi/agent/governance.yaml` (global) or `.pi/governance.yaml` (project-local if run with `--local` flag).

### 12.3 `/governance audit` (P1)

**Behavior:** Display the last N audit records from the configured JSONL sink, filterable by event type.

### 12.4 `/governance test` (P2)

**Behavior:** Dry-run a hypothetical tool call against the current policy. E.g., `/governance test bash "rm -rf /tmp/test"` → "DENIED: bash command classified as dangerous."

---

## 13. Testing Strategy

### 13.1 Unit Tests (~80+ tests, no Pi dependency)

All `lib/` modules are tested in isolation with no Pi imports.

| Module                    | Test Coverage                                                                                                                                                                                       | Key Test Cases |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `config/loader`           | Config resolution priority, env var substitution, schema validation errors, defaults applied for missing fields, malformed YAML handling                                                            |
| `config/schema`           | Every config field validates correctly, invalid types rejected, defaults applied                                                                                                                    |
| `policy/yaml-engine`      | Tool evaluation for each role, path matching with globs, blocked paths take precedence, unknown role error, approval matrix                                                                         |
| `policy/oso-engine`       | Same cases as YAML engine but using Polar policies, dynamic import failure handling                                                                                                                 |
| `policy/factory`          | Correct engine instantiation based on config, error on unknown engine                                                                                                                               |
| `identity/env-provider`   | Resolves from env vars, returns null when vars missing, custom var names                                                                                                                            |
| `identity/local-provider` | Resolves from users.yaml, unknown user returns null                                                                                                                                                 |
| `identity/chain`          | Priority order, fallback to default                                                                                                                                                                 |
| `bash/classifier`         | 30+ safe commands classified correctly, 30+ dangerous commands classified correctly, multi-command splitting (pipes, semicolons, &&), quote handling, needs_review default, role-specific overrides |
| `audit/jsonl-sink`        | Writes valid JSONL, creates directory if missing, buffer flush on threshold, tilde expansion                                                                                                        |
| `audit/webhook-sink`      | POST with correct body, retry on failure, timeout handling                                                                                                                                          |
| `audit/logger`            | Multi-sink dispatch, flush all sinks, default sink when none configured                                                                                                                             |
| `templates/selector`      | User templates override bundled, missing template error, fallback to bundled                                                                                                                        |
| `templates/renderer`      | Variable substitution, array variables, undefined variables left as-is                                                                                                                              |
| `hitl/cli-approver`       | Approval accepted, approval denied, timeout auto-deny                                                                                                                                               |

### 13.2 Integration Tests (~15–20 tests, mocked Pi ExtensionAPI)

Tests exercise the full extension lifecycle with a mocked `ExtensionContext`.

| Test                                     | What It Verifies                                                      |
| ---------------------------------------- | --------------------------------------------------------------------- |
| Session start initializes all components | Config loaded, identity resolved, policy engine created, audit logged |
| Analyst denied bash tool                 | Tool call blocked, audit record emitted, denial count incremented     |
| Analyst allowed read tool                | Tool call proceeds, audit record emitted                              |
| Project lead bash needs approval         | Approval requested via CLI, approved → proceeds, denied → blocked     |
| Admin full autonomy                      | All tools allowed, no approval requested                              |
| Dangerous bash always denied             | Even admin can't run `rm -rf /` (classified dangerous)                |
| Path boundary enforcement                | Write outside allowed paths denied                                    |
| Dry-run mode blocks all execution        | All tool calls logged as dry_run, none executed                       |
| Session end emits summary                | Summary record with correct counts                                    |
| Config not found uses defaults           | Built-in defaults applied, session starts successfully                |
| Oso engine with Polar policies           | Full flow using Oso instead of YAML                                   |
| Multi-command bash classification        | `cat file.txt && rm -rf /` classified as dangerous                    |
| Template selection by role               | Correct template injected for each role                               |
| Multiple audit sinks                     | Both JSONL and webhook receive records                                |

### 13.3 CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v4
        if: matrix.node-version == 20

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
```

### 13.4 Release Pipeline

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      packages: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - run: npx semantic-release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 13.5 Documentation Pipeline

```yaml
# .github/workflows/docs.yml
name: Documentation

on:
  push:
    branches: [main]
    paths: ['docs/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run docs:build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: docs/.vitepress/dist
      - uses: actions/deploy-pages@v4
```

---

## 14. Error Handling

### 14.1 Error Categories

| Category                    | Behavior                                                                                                                                                                          | Example                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Config error                | Extension fails to initialize, prints clear error, Pi continues without governance                                                                                                | Invalid YAML, missing required field, unknown policy engine |
| Identity resolution failure | Falls back to default restricted role, logs warning                                                                                                                               | No env vars set, users.yaml not found                       |
| Policy evaluation error     | Deny by default, log error                                                                                                                                                        | Unknown role in policy, malformed Polar                     |
| Audit sink failure          | Log to stderr, continue operation (governance enforcement is not blocked by audit failures)                                                                                       | Webhook timeout, disk full for JSONL                        |
| HITL timeout                | Deny the action, log timeout event                                                                                                                                                | User didn't respond within timeout                          |
| Pi API incompatibility      | Extension logs warning about missing hooks, degrades gracefully (e.g., if `onBeforeToolCall` doesn't exist, governance can't enforce but audit still works via `onAfterToolCall`) | Pi version too old                                          |

### 14.2 Graceful Degradation Principle

The extension must **never crash the Pi session**. All errors within the governance extension are caught, logged, and handled gracefully. In the worst case, the extension becomes a no-op and logs a warning. Pi must always remain functional even if the governance extension encounters errors.

---

## 15. Documentation Site Structure

```
docs/
├── .vitepress/
│   └── config.ts              # VitePress config with navigation
├── index.md                   # Landing page
├── guide/
│   ├── quickstart.md          # Install + first session (< 2 min)
│   ├── team-deployment.md     # Project-local config + git workflow
│   ├── yaml-policies.md       # YAML policy engine guide with examples
│   ├── oso-policies.md        # Oso/Polar policy engine guide with examples
│   ├── bash-classifier.md     # How bash classification works
│   ├── hitl.md                # Human-in-the-loop configuration
│   ├── audit.md               # Audit logging setup and sinks
│   └── openclaw.md            # Using with OpenClaw
├── reference/
│   ├── config.md              # Full governance.yaml schema reference
│   ├── api.md                 # TypeScript interfaces for contributors
│   ├── bash-patterns.md       # Complete list of default patterns
│   └── audit-schema.md        # Audit record format reference
└── examples/
    ├── solo-developer.md      # Single dev, basic lockdown
    ├── multi-team-rollup.md   # Multiple acquisitions, different policies
    ├── ci-pipeline.md         # Governance in automated pipelines
    └── custom-webhook.md      # Custom HITL approval via Slack
```

---

## 16. Glossary

| Term               | Definition                                                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| **Pi**             | An open-source coding agent framework by Mario Zechner. Provides 4 tools (read, write, edit, bash) and an extension system. |
| **OpenClaw**       | An open-source agent model built on Pi, accessed via WhatsApp/Telegram/Discord/Web.                                         |
| **Extension**      | A TypeScript module that hooks into Pi's agent lifecycle events.                                                            |
| **Polar**          | Oso's declarative logic language for writing authorization policies.                                                        |
| **FactStore**      | The data layer that stores role assignments and relationships, consumed by the policy engine.                               |
| **HITL**           | Human-in-the-loop — requiring human approval before the agent executes certain actions.                                     |
| **Org Unit**       | An organizational boundary (typically an acquired company) used for data isolation and policy scoping.                      |
| **Execution Mode** | The governance strictness level: autonomous (no approval), supervised (approval per matrix), dry_run (no execution).        |

---

_End of Functional Specification_
