import { CliApprover } from './cli-approver.js';
import { WebhookApprover } from './webhook-approver.js';

export interface GovernanceToolCall {
  toolName: string;
  input: Record<string, unknown>;
}

export interface ApprovalResult {
  approved: boolean;
  reason?: string;
  approver: string;
  duration: number;
}

export interface ApprovalFlow {
  requestApproval(
    toolCall: GovernanceToolCall,
    context: { userId: string; role: string; orgUnit: string },
  ): Promise<ApprovalResult>;
}

export interface ConfirmUI {
  confirm(title: string, message: string, opts?: { timeout?: number }): Promise<boolean>;
}

export interface HitlConfig {
  default_mode: 'autonomous' | 'supervised' | 'dry_run';
  approval_channel: 'cli' | 'webhook';
  timeout_seconds: number;
  webhook?: { url: string };
}

export function createApprovalFlow(config: HitlConfig, ui?: ConfirmUI): ApprovalFlow {
  if (config.approval_channel === 'webhook' && config.webhook?.url) {
    return new WebhookApprover(config.webhook.url, config.timeout_seconds);
  }

  // Fall back to CLI (also handles webhook without URL)
  if (!ui) {
    throw new Error('CLI approval channel requires a ConfirmUI (ExtensionContext.ui)');
  }

  return new CliApprover(ui, config.timeout_seconds);
}
