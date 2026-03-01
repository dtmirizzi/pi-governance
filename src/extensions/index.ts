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

import { loadConfig } from '../lib/config/loader.js';
import { createIdentityChain } from '../lib/identity/chain.js';
import { YamlPolicyEngine } from '../lib/policy/yaml-engine.js';
import { BashClassifier } from '../lib/bash/classifier.js';
import { AuditLogger } from '../lib/audit/logger.js';
import { createApprovalFlow } from '../lib/hitl/approval.js';
import type { ApprovalFlow } from '../lib/hitl/approval.js';
import type { PolicyEngine, ExecutionMode } from '../lib/policy/engine.js';
import type { ResolvedIdentity } from '../lib/identity/provider.js';
import type { GovernanceConfig } from '../lib/config/schema.js';

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

  const stats = { allowed: 0, denied: 0, approvals: 0, dryRun: 0 };

  pi.on('session_start', async (_event, ctx) => {
    sessionId = ctx.sessionId;

    // 1. Load config
    const loaded = loadConfig();
    config = loaded.config;

    // 2. Resolve identity
    const chain = createIdentityChain(config.auth);
    identity = await chain.resolve();

    // 3. Create policy engine
    const rulesFile = config.policy?.yaml?.rules_file ?? './governance-rules.yaml';
    policyEngine = new YamlPolicyEngine(rulesFile);

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

    // 8. Audit session start
    await audit.log({
      sessionId,
      event: 'session_start',
      userId: identity.userId,
      role: identity.role,
      orgUnit: identity.orgUnit,
      metadata: { source: loaded.source, executionMode },
    });

    // 9. UI feedback
    ctx.ui.setStatus('governance', `Governance: ${identity.role} (${executionMode})`);
    ctx.ui.notify(
      `Governance active — Role: ${identity.role} | Mode: ${executionMode} | Org: ${identity.orgUnit}`,
      'info',
    );
  });

  pi.on('tool_call', async (event, _ctx) => {
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

    // 2. Policy: evaluate tool access
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

    // 3. Bash-specific classification
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

    // 4. Path boundary check for file tools
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

    // 5. HITL approval for non-bash tools if required
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

    // 6. Tool allowed
    stats.allowed++;
    await audit.log({ ...baseRecord, event: 'tool_allowed', decision: 'allowed' });
    return undefined;
  });

  pi.on('tool_result', async (event, _ctx) => {
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
    await audit.log({
      sessionId,
      event: 'session_end',
      userId: identity.userId,
      role: identity.role,
      orgUnit: identity.orgUnit,
      metadata: { stats: { ...stats }, summary: Object.fromEntries(audit.getSummary()) },
    });
    await audit.flush();
  });

  pi.registerCommand('governance', {
    description: 'Governance status and controls',
    handler: async (args, ctx) => {
      const subcommand = args.trim().split(/\s+/)[0] ?? '';

      if (subcommand === 'status') {
        const summary = audit.getSummary();
        const lines = [
          `Role: ${identity.role}`,
          `Org Unit: ${identity.orgUnit}`,
          `Mode: ${executionMode}`,
          `Session: ${sessionId}`,
          '',
          'Session Stats:',
          `  Allowed: ${stats.allowed}`,
          `  Denied: ${stats.denied}`,
          `  Approvals: ${stats.approvals}`,
          `  Dry-run blocks: ${stats.dryRun}`,
          '',
          'Audit Events:',
          ...[...summary.entries()].map(([k, v]) => `  ${k}: ${v}`),
        ];
        ctx.ui.notify(lines.join('\n'), 'info');
      } else {
        ctx.ui.notify('Usage: /governance status', 'info');
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
