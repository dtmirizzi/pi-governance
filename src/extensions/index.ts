// Pi Extension API types — locally defined to avoid hard dependency on @mariozechner/pi-coding-agent
// These match the real Pi extension API surface.

interface ToolCallEvent {
  toolName: string;
  input: Record<string, unknown>;
}

interface ToolResultEvent {
  toolName: string;
  input: Record<string, unknown>;
  output: string;
  isError: boolean;
}

interface ExtensionUI {
  confirm(title: string, message: string, opts?: { timeout?: number }): Promise<boolean>;
  notify(msg: string, type?: 'info' | 'warning' | 'error'): void;
  setStatus(key: string, text: string): void;
}

interface ExtensionContext {
  ui: ExtensionUI;
  sessionId: string;
  workingDirectory: string;
}

type ToolCallHandler = (
  event: ToolCallEvent,
  ctx: ExtensionContext,
) => Promise<{ block: true; reason: string } | void>;

type ToolResultHandler = (event: ToolResultEvent, ctx: ExtensionContext) => Promise<void>;

type SessionHandler = (event: unknown, ctx: ExtensionContext) => Promise<void>;

interface ExtensionAPI {
  on(event: 'session_start', handler: SessionHandler): void;
  on(event: 'session_shutdown', handler: SessionHandler): void;
  on(event: 'tool_call', handler: ToolCallHandler): void;
  on(event: 'tool_result', handler: ToolResultHandler): void;
  registerCommand(
    name: string,
    opts: {
      description?: string;
      handler: (args: string, ctx: ExtensionContext) => Promise<void>;
    },
  ): void;
}

type ExtensionFactory = (pi: ExtensionAPI) => void;

// --- Implementation ---

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig } from '../lib/config/loader.js';
import { createIdentityChain } from '../lib/identity/chain.js';
import { YamlPolicyEngine } from '../lib/policy/yaml-engine.js';
import { BashClassifier } from '../lib/bash/classifier.js';
import { AuditLogger } from '../lib/audit/logger.js';
import { createApprovalFlow } from '../lib/hitl/approval.js';
import { BudgetTracker } from '../lib/budget/tracker.js';
import { ConfigWatcher } from '../lib/config/watcher.js';
import { DlpScanner } from '../lib/dlp/scanner.js';
import { DlpMasker } from '../lib/dlp/masker.js';
import type { DlpAction, DlpMatch, DlpScannerConfig } from '../lib/dlp/scanner.js';
import type { ApprovalFlow } from '../lib/hitl/approval.js';
import type { PolicyEngine, ExecutionMode } from '../lib/policy/engine.js';
import type { ResolvedIdentity } from '../lib/identity/provider.js';
import type { GovernanceConfig, DlpConfigType } from '../lib/config/schema.js';

// Tools that involve file paths — used for path boundary checks
const PATH_TOOLS: Record<string, string> = {
  read: 'path',
  write: 'path',
  edit: 'file_path',
  grep: 'path',
  find: 'path',
  ls: 'path',
};

// Tools that are write operations for path checking
const WRITE_TOOLS = new Set(['write', 'edit']);

function summarizeParams(
  toolName: string,
  input: Record<string, unknown>,
): Record<string, unknown> {
  switch (toolName) {
    case 'bash': {
      const cmd = typeof input['command'] === 'string' ? input['command'] : '';
      return { command: cmd.slice(0, 100) + (cmd.length > 100 ? '...' : '') };
    }
    case 'read':
      return { path: input['path'] };
    case 'write':
      return { path: input['path'] };
    case 'edit':
      return { file_path: input['file_path'] };
    case 'grep':
      return { pattern: input['pattern'], path: input['path'] };
    case 'find':
    case 'ls':
      return { path: input['path'] };
    default:
      return {};
  }
}

function extractPath(toolName: string, input: Record<string, unknown>): string | undefined {
  const key = PATH_TOOLS[toolName];
  if (!key) return undefined;
  const val = input[key];
  return typeof val === 'string' ? val : undefined;
}

// --- DLP helpers ---

const ACTION_PRIORITY: Record<DlpAction, number> = { audit: 0, mask: 1, block: 2 };

function extractDlpFields(toolName: string, input: Record<string, unknown>): Map<string, string> {
  const fields = new Map<string, string>();
  switch (toolName) {
    case 'bash': {
      const cmd = input['command'];
      if (typeof cmd === 'string') fields.set('command', cmd);
      break;
    }
    case 'write': {
      const content = input['content'];
      if (typeof content === 'string') fields.set('content', content);
      const path = input['path'];
      if (typeof path === 'string') fields.set('path', path);
      break;
    }
    case 'edit': {
      const newStr = input['new_string'];
      if (typeof newStr === 'string') fields.set('new_string', newStr);
      const oldStr = input['old_string'];
      if (typeof oldStr === 'string') fields.set('old_string', oldStr);
      break;
    }
    default: {
      // Scan all string values
      for (const [key, val] of Object.entries(input)) {
        if (typeof val === 'string') fields.set(key, val);
      }
    }
  }
  return fields;
}

function resolveHighestAction(
  scanner: DlpScanner,
  matches: DlpMatch[],
  direction: 'input' | 'output',
): DlpAction {
  let highest: DlpAction = 'audit';
  for (const match of matches) {
    const action = scanner.getPatternAction(match, direction);
    if (ACTION_PRIORITY[action] > ACTION_PRIORITY[highest]) {
      highest = action;
    }
  }
  return highest;
}

function resolveDlpConfig(
  dlpConfig: DlpConfigType | undefined,
  role: string,
): DlpScannerConfig | undefined {
  if (!dlpConfig?.enabled) return undefined;

  // Apply role overrides
  const roleOverride = dlpConfig.role_overrides?.[role];
  if (roleOverride?.enabled === false) return undefined;

  const patternOverrides = new Map<string, DlpAction>();

  return {
    enabled: true,
    mode: roleOverride?.mode ?? dlpConfig.mode ?? 'audit',
    on_input: roleOverride?.on_input ?? dlpConfig.on_input,
    on_output: roleOverride?.on_output ?? dlpConfig.on_output,
    severity_threshold: dlpConfig.severity_threshold ?? 'low',
    built_in: {
      secrets: dlpConfig.built_in?.secrets ?? true,
      pii: dlpConfig.built_in?.pii ?? true,
    },
    custom_patterns: (dlpConfig.custom_patterns ?? []).map((cp) => ({
      name: cp.name,
      pattern: cp.pattern,
      severity: cp.severity,
      action: cp.action as DlpAction | undefined,
    })),
    allowlist: dlpConfig.allowlist ?? [],
    pattern_overrides: patternOverrides,
  };
}

const piGovernance: ExtensionFactory = (pi) => {
  // State — initialized in session_start
  let config: GovernanceConfig;
  let policyEngine: PolicyEngine;
  let audit: AuditLogger;
  let approvalFlow: ApprovalFlow | undefined;
  let bashClassifier: BashClassifier;
  let identity: ResolvedIdentity;
  let executionMode: ExecutionMode;
  let sessionId: string;
  let budgetTracker: BudgetTracker;
  let configWatcher: ConfigWatcher | undefined;
  let dlpScanner: DlpScanner | undefined;
  let dlpMasker: DlpMasker | undefined;
  let protectedPaths: Set<string> = new Set();

  const stats = {
    configTampered: 0,
    allowed: 0,
    denied: 0,
    approvals: 0,
    dryRun: 0,
    budgetExceeded: 0,
    dlpBlocked: 0,
    dlpDetected: 0,
    dlpMasked: 0,
  };

  pi.on('session_start', async (_event, ctx) => {
    sessionId = ctx.sessionId;

    // 1. Load config
    const loaded = loadConfig();
    config = loaded.config;

    // 1b. Compute protected config paths (hardcoded — cannot be overridden)
    const paths = new Set<string>();
    if (loaded.source !== 'built-in') {
      paths.add(resolve(loaded.source));
    }
    const rulesFileCfg = config.policy?.yaml?.rules_file ?? './governance-rules.yaml';
    paths.add(resolve(rulesFileCfg));
    // Fallback well-known paths
    paths.add(resolve(ctx.workingDirectory, '.pi/governance.yaml'));
    paths.add(resolve(ctx.workingDirectory, 'governance-rules.yaml'));
    protectedPaths = paths;

    // 2. Resolve identity
    const chain = createIdentityChain(config.auth);
    identity = await chain.resolve();

    // 3. Create policy engine
    const rulesFile = config.policy?.yaml?.rules_file ?? './governance-rules.yaml';
    if (existsSync(rulesFile)) {
      policyEngine = new YamlPolicyEngine(rulesFile);
    } else {
      // No rules file found — use permissive defaults so the extension doesn't crash
      policyEngine = new YamlPolicyEngine({
        roles: {
          admin: {
            allowed_tools: ['all'],
            blocked_tools: [],
            prompt_template: 'admin',
            execution_mode: 'autonomous',
            human_approval: { required_for: [] },
            token_budget_daily: -1,
            allowed_paths: ['**'],
            blocked_paths: [],
          },
          project_lead: {
            allowed_tools: ['all'],
            blocked_tools: [],
            prompt_template: 'project-lead',
            execution_mode: 'supervised',
            human_approval: { required_for: ['bash', 'write'] },
            token_budget_daily: -1,
            allowed_paths: ['**'],
            blocked_paths: [],
          },
          analyst: {
            allowed_tools: ['read', 'grep', 'find', 'ls'],
            blocked_tools: ['write', 'edit', 'bash'],
            prompt_template: 'analyst',
            execution_mode: 'supervised',
            human_approval: { required_for: ['all'] },
            token_budget_daily: -1,
            allowed_paths: ['**'],
            blocked_paths: [],
          },
        },
      });
      // Only warn if the user explicitly configured a rules file path
      if (config.policy?.yaml?.rules_file) {
        ctx.ui.notify(`Rules file not found: ${rulesFile} — using built-in defaults`, 'warning');
      }
    }

    // 4. Get execution mode
    executionMode = policyEngine.getExecutionMode(identity.role);

    // 5. Create bash classifier with role overrides
    const bashOverrides = policyEngine.getBashOverrides(identity.role);
    bashClassifier = new BashClassifier(bashOverrides);

    // 6. Create audit logger
    audit = new AuditLogger(config.audit);

    // 7. Create approval flow if supervised mode
    if (executionMode === 'supervised') {
      try {
        approvalFlow = createApprovalFlow(
          {
            default_mode: config.hitl?.default_mode ?? 'supervised',
            approval_channel: config.hitl?.approval_channel ?? 'cli',
            timeout_seconds: config.hitl?.timeout_seconds ?? 300,
            webhook: config.hitl?.webhook,
          },
          ctx.ui,
        );
      } catch {
        // If CLI UI not available, approval flow stays undefined
      }
    }

    // 8. Create budget tracker
    const budget = policyEngine.getTokenBudget(identity.role);
    budgetTracker = new BudgetTracker(budget);

    // 9. Initialize DLP scanner/masker if enabled
    const dlpCfg = resolveDlpConfig(config.dlp, identity.role);
    if (dlpCfg) {
      dlpScanner = new DlpScanner(dlpCfg);
      dlpMasker = new DlpMasker(config.dlp?.masking);
    }

    // 10. Start config watcher
    if (loaded.source !== 'built-in') {
      configWatcher = new ConfigWatcher(
        loaded.source,
        (newConfig) => {
          config = newConfig;
          const newRulesFile = newConfig.policy?.yaml?.rules_file ?? './governance-rules.yaml';
          if (existsSync(newRulesFile)) {
            policyEngine = new YamlPolicyEngine(newRulesFile);
          }
          const newOverrides = policyEngine.getBashOverrides(identity.role);
          bashClassifier = new BashClassifier(newOverrides);
          // Recreate DLP scanner/masker on config reload
          const newDlpCfg = resolveDlpConfig(newConfig.dlp, identity.role);
          if (newDlpCfg) {
            dlpScanner = new DlpScanner(newDlpCfg);
            dlpMasker = new DlpMasker(newConfig.dlp?.masking);
          } else {
            dlpScanner = undefined;
            dlpMasker = undefined;
          }
          audit.log({
            sessionId,
            event: 'config_reloaded',
            userId: identity.userId,
            role: identity.role,
            orgUnit: identity.orgUnit,
            metadata: { source: loaded.source },
          });
          ctx.ui.notify('Governance config reloaded', 'info');
        },
        (error) => {
          ctx.ui.notify(`Config reload failed: ${error.message}`, 'warning');
        },
      );
      configWatcher.start();
    }

    // 10. Audit session start
    await audit.log({
      sessionId,
      event: 'session_start',
      userId: identity.userId,
      role: identity.role,
      orgUnit: identity.orgUnit,
      metadata: { source: loaded.source, executionMode },
    });

    // 11. UI feedback
    ctx.ui.setStatus('governance', `Governance: ${identity.role} (${executionMode})`);
    ctx.ui.notify(
      `Governance active — Role: ${identity.role} | Mode: ${executionMode} | Org: ${identity.orgUnit}`,
      'info',
    );
  });

  pi.on('tool_call', async (event, _ctx) => {
    if (!audit || !policyEngine || !identity) return undefined;

    const { toolName, input } = event;
    const params = summarizeParams(toolName, input);

    const baseRecord = {
      sessionId,
      userId: identity.userId,
      role: identity.role,
      orgUnit: identity.orgUnit,
      tool: toolName,
      input: params,
    };

    // 0. Hardcoded config self-protection — cannot be bypassed by policy
    if (WRITE_TOOLS.has(toolName)) {
      const filePath = extractPath(toolName, input);
      if (filePath && protectedPaths.has(resolve(filePath))) {
        stats.configTampered++;
        await audit.log({
          ...baseRecord,
          event: 'config_tampered',
          decision: 'denied',
          reason: `Config self-protection: write to governance file blocked (${filePath})`,
        });
        return {
          block: true,
          reason: `Governance config files are protected and cannot be modified by agents`,
        };
      }
    }

    // 1. Dry-run mode — block everything, log as dry_run
    if (executionMode === 'dry_run') {
      stats.dryRun++;
      await audit.log({
        ...baseRecord,
        event: 'tool_dry_run',
        decision: 'blocked',
        reason: 'Dry-run mode',
      });
      return { block: true, reason: 'Dry-run mode: tool execution blocked for observation' };
    }

    // 2. Budget check
    if (!budgetTracker.consume()) {
      stats.budgetExceeded++;
      await audit.log({
        ...baseRecord,
        event: 'budget_exceeded',
        decision: 'denied',
        reason: `Budget exhausted (${budgetTracker.used()} invocations used)`,
      });
      return {
        block: true,
        reason: `Tool invocation budget exhausted (${budgetTracker.used()} used). Session limit reached.`,
      };
    }

    // 3. Policy: evaluate tool access
    const toolDecision = policyEngine.evaluateTool(identity.role, toolName);
    if (toolDecision === 'deny') {
      stats.denied++;
      await audit.log({
        ...baseRecord,
        event: 'tool_denied',
        decision: 'denied',
        reason: 'Policy denied tool',
      });
      return { block: true, reason: `Policy denies ${identity.role} from using ${toolName}` };
    }

    // 4. Bash-specific classification
    if (toolName === 'bash') {
      const command = typeof input['command'] === 'string' ? input['command'] : '';
      const classification = bashClassifier.classify(command);

      if (classification === 'dangerous') {
        stats.denied++;
        await audit.log({
          ...baseRecord,
          event: 'bash_denied',
          decision: 'denied',
          reason: 'Dangerous command',
        });
        return { block: true, reason: `Dangerous bash command blocked: ${command.slice(0, 80)}` };
      }

      // needs_review with approval required
      if (
        classification === 'needs_review' &&
        policyEngine.requiresApproval(identity.role, 'bash')
      ) {
        if (approvalFlow) {
          stats.approvals++;
          await audit.log({ ...baseRecord, event: 'approval_requested' });

          const result = await approvalFlow.requestApproval(
            { toolName, input },
            { userId: identity.userId, role: identity.role, orgUnit: identity.orgUnit },
          );

          if (result.approved) {
            await audit.log({
              ...baseRecord,
              event: 'approval_granted',
              duration: result.duration,
            });
          } else {
            stats.denied++;
            await audit.log({
              ...baseRecord,
              event: 'approval_denied',
              reason: result.reason,
              duration: result.duration,
            });
            return { block: true, reason: result.reason ?? 'Approval denied' };
          }
        } else {
          // No approval flow — deny
          stats.denied++;
          await audit.log({
            ...baseRecord,
            event: 'tool_denied',
            decision: 'denied',
            reason: 'Requires approval but no approval channel',
          });
          return {
            block: true,
            reason: 'Bash command requires approval but no approval channel is configured',
          };
        }
      }
    }

    // 5. Path boundary check for file tools
    const path = extractPath(toolName, input);
    if (path) {
      const operation = WRITE_TOOLS.has(toolName) ? 'write' : 'read';
      const pathDecision = policyEngine.evaluatePath(
        identity.role,
        identity.orgUnit,
        operation,
        path,
      );
      if (pathDecision === 'deny') {
        stats.denied++;
        await audit.log({
          ...baseRecord,
          event: 'path_denied',
          decision: 'denied',
          reason: `Path denied: ${path}`,
        });
        return { block: true, reason: `Access denied to path: ${path}` };
      }
    }

    // 6. DLP scan inputs
    if (dlpScanner && dlpMasker) {
      const fields = extractDlpFields(toolName, input);
      const allMatches: DlpMatch[] = [];
      for (const [, fieldValue] of fields) {
        const result = dlpScanner.scan(fieldValue);
        allMatches.push(...result.matches);
      }

      if (allMatches.length > 0) {
        const action = resolveHighestAction(dlpScanner, allMatches, 'input');
        const patternNames = [...new Set(allMatches.map((m) => m.patternName))];
        const severities = [...new Set(allMatches.map((m) => m.severity))];
        const dlpMeta = {
          patterns: patternNames,
          severities,
          direction: 'input' as const,
          count: allMatches.length,
        };

        if (action === 'block') {
          stats.dlpBlocked++;
          await audit.log({
            ...baseRecord,
            event: 'dlp_blocked',
            decision: 'denied',
            reason: `DLP: ${patternNames.join(', ')} detected in input`,
            metadata: dlpMeta,
          });
          return {
            block: true,
            reason: `DLP blocked: sensitive data detected (${patternNames.join(', ')})`,
          };
        }

        if (action === 'mask') {
          stats.dlpMasked++;
          // Mask each field independently to maintain correct positions
          for (const [fieldKey, fieldValue] of fields) {
            const fieldResult = dlpScanner.scan(fieldValue);
            if (fieldResult.hasMatches) {
              (input as Record<string, unknown>)[fieldKey] = dlpMasker.maskText(
                fieldValue,
                fieldResult.matches,
              );
            }
          }
          await audit.log({
            ...baseRecord,
            event: 'dlp_masked',
            metadata: { ...dlpMeta, strategy: dlpMasker['config'].strategy },
          });
        } else {
          // audit-only
          stats.dlpDetected++;
          await audit.log({
            ...baseRecord,
            event: 'dlp_detected',
            metadata: dlpMeta,
          });
        }
      }
    }

    // 7. HITL approval for non-bash tools if required
    if (toolName !== 'bash' && policyEngine.requiresApproval(identity.role, toolName)) {
      if (approvalFlow) {
        stats.approvals++;
        await audit.log({ ...baseRecord, event: 'approval_requested' });

        const result = await approvalFlow.requestApproval(
          { toolName, input },
          { userId: identity.userId, role: identity.role, orgUnit: identity.orgUnit },
        );

        if (result.approved) {
          await audit.log({ ...baseRecord, event: 'approval_granted', duration: result.duration });
        } else {
          stats.denied++;
          await audit.log({
            ...baseRecord,
            event: 'approval_denied',
            reason: result.reason,
            duration: result.duration,
          });
          return { block: true, reason: result.reason ?? 'Approval denied' };
        }
      }
    }

    // 8. Tool allowed
    stats.allowed++;
    await audit.log({ ...baseRecord, event: 'tool_allowed', decision: 'allowed' });
    return undefined;
  });

  pi.on('tool_result', async (event, _ctx) => {
    if (!audit || !identity) return;

    // DLP scan output before audit
    if (dlpScanner && dlpMasker && event.output) {
      const result = dlpScanner.scan(event.output);
      if (result.hasMatches) {
        const action = resolveHighestAction(dlpScanner, result.matches, 'output');
        const patternNames = [...new Set(result.matches.map((m) => m.patternName))];
        const severities = [...new Set(result.matches.map((m) => m.severity))];
        const dlpMeta = {
          patterns: patternNames,
          severities,
          direction: 'output' as const,
          count: result.matches.length,
        };

        if (action === 'mask' || action === 'block') {
          // block degrades to mask for outputs (handler returns void)
          stats.dlpMasked++;
          event.output = dlpMasker.maskText(event.output, result.matches);
          await audit.log({
            sessionId,
            event: 'dlp_masked',
            userId: identity.userId,
            role: identity.role,
            orgUnit: identity.orgUnit,
            tool: event.toolName,
            metadata: { ...dlpMeta, strategy: dlpMasker['config'].strategy },
          });
        } else {
          stats.dlpDetected++;
          await audit.log({
            sessionId,
            event: 'dlp_detected',
            userId: identity.userId,
            role: identity.role,
            orgUnit: identity.orgUnit,
            tool: event.toolName,
            metadata: dlpMeta,
          });
        }
      }
    }

    await audit.log({
      sessionId,
      event: 'tool_result',
      userId: identity.userId,
      role: identity.role,
      orgUnit: identity.orgUnit,
      tool: event.toolName,
      input: summarizeParams(event.toolName, event.input),
      metadata: { isError: event.isError },
    });
  });

  pi.on('session_shutdown', async (_event, _ctx) => {
    configWatcher?.stop();
    if (!audit) return;
    await audit.log({
      sessionId,
      event: 'session_end',
      userId: identity?.userId,
      role: identity?.role,
      orgUnit: identity?.orgUnit,
      metadata: {
        stats: { ...stats },
        budget: budgetTracker
          ? { used: budgetTracker.used(), remaining: budgetTracker.remaining() }
          : undefined,
        summary: Object.fromEntries(audit.getSummary()),
      },
    });
    await audit.flush();
  });

  pi.registerCommand('governance', {
    description: 'Governance status and controls',
    handler: async (args, ctx) => {
      const subcommand = args.trim().split(/\s+/)[0] ?? '';

      if (subcommand === 'status') {
        const summary = audit.getSummary();
        const budgetInfo = budgetTracker.isUnlimited()
          ? 'unlimited'
          : `${budgetTracker.used()} / ${budgetTracker.used() + budgetTracker.remaining()} (${budgetTracker.remaining()} remaining)`;
        const lines = [
          `Role: ${identity.role}`,
          `Org Unit: ${identity.orgUnit}`,
          `Mode: ${executionMode}`,
          `Session: ${sessionId}`,
          `Budget: ${budgetInfo}`,
          '',
          'Session Stats:',
          `  Allowed: ${stats.allowed}`,
          `  Denied: ${stats.denied}`,
          `  Approvals: ${stats.approvals}`,
          `  Dry-run blocks: ${stats.dryRun}`,
          `  Budget exceeded: ${stats.budgetExceeded}`,
          `  Config tampered: ${stats.configTampered}`,
          `  DLP blocked: ${stats.dlpBlocked}`,
          `  DLP detected: ${stats.dlpDetected}`,
          `  DLP masked: ${stats.dlpMasked}`,
          '',
          'Audit Events:',
          ...[...summary.entries()].map(([k, v]) => `  ${k}: ${v}`),
        ];
        ctx.ui.notify(lines.join('\n'), 'info');
      } else if (subcommand === 'init') {
        const { startWizardServer } = await import('../lib/wizard/index.js');

        ctx.ui.notify('Starting governance configuration wizard...', 'info');

        const { port, close } = await startWizardServer({
          workingDirectory: ctx.workingDirectory,
          existingConfig: config,
          onComplete: (files) => {
            const names = files.map((f) => f.path).join(', ');
            ctx.ui.notify(`Configuration saved: ${names}`, 'info');
            close();
          },
          onError: (err) => {
            ctx.ui.notify(`Wizard error: ${err.message}`, 'error');
            close();
          },
        });

        const url = `http://localhost:${port}`;
        const { exec } = await import('node:child_process');
        const openCmd =
          process.platform === 'darwin'
            ? 'open'
            : process.platform === 'win32'
              ? 'start'
              : 'xdg-open';
        exec(`${openCmd} ${url}`);

        ctx.ui.notify(`Wizard running at ${url}`, 'info');
      } else {
        ctx.ui.notify('Usage: /governance status | init', 'info');
      }
    },
  });
};

export default piGovernance;

// Re-export types for consumers
export type {
  ExtensionFactory,
  ExtensionAPI,
  ExtensionContext,
  ExtensionUI,
  ToolCallEvent,
  ToolResultEvent,
};
