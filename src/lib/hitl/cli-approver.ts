import type { ApprovalFlow, ApprovalResult, GovernanceToolCall, ConfirmUI } from './approval.js';

export class CliApprover implements ApprovalFlow {
  private ui: ConfirmUI;
  private timeoutSeconds: number;

  constructor(ui: ConfirmUI, timeoutSeconds: number = 300) {
    this.ui = ui;
    this.timeoutSeconds = timeoutSeconds;
  }

  async requestApproval(
    toolCall: GovernanceToolCall,
    context: { userId: string; role: string; orgUnit: string },
  ): Promise<ApprovalResult> {
    const title = `Approval Required: ${toolCall.toolName}`;
    const inputSummary = Object.entries(toolCall.input)
      .map(
        ([k, v]) =>
          `  ${k}: ${typeof v === 'string' ? v.slice(0, 200) : JSON.stringify(v).slice(0, 200)}`,
      )
      .join('\n');
    const message = `User: ${context.userId} (${context.role})\nOrg: ${context.orgUnit}\n\nTool: ${toolCall.toolName}\nInput:\n${inputSummary}`;

    const start = Date.now();

    try {
      const approved = await this.ui.confirm(title, message, {
        timeout: this.timeoutSeconds * 1000,
      });

      return {
        approved,
        approver: 'cli',
        duration: Date.now() - start,
        reason: approved ? undefined : 'Denied by user',
      };
    } catch {
      // Timeout or error — deny
      return {
        approved: false,
        approver: 'cli',
        duration: Date.now() - start,
        reason: 'Approval timed out',
      };
    }
  }
}
