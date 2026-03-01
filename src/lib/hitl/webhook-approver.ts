import type { ApprovalFlow, ApprovalResult, GovernanceToolCall } from './approval.js';

export class WebhookApprover implements ApprovalFlow {
  private url: string;
  private timeoutMs: number;

  constructor(url: string, timeoutSeconds: number = 300) {
    this.url = url;
    this.timeoutMs = timeoutSeconds * 1000;
  }

  async requestApproval(
    toolCall: GovernanceToolCall,
    context: { userId: string; role: string; orgUnit: string },
  ): Promise<ApprovalResult> {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolCall: { toolName: toolCall.toolName, input: toolCall.input },
          context,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        return {
          approved: false,
          approver: 'webhook',
          duration: Date.now() - start,
          reason: `Webhook returned ${response.status}`,
        };
      }

      const body = (await response.json()) as { approved: boolean; reason?: string };

      return {
        approved: body.approved,
        approver: 'webhook',
        duration: Date.now() - start,
        reason: body.reason,
      };
    } catch (err) {
      return {
        approved: false,
        approver: 'webhook',
        duration: Date.now() - start,
        reason:
          err instanceof Error && err.name === 'AbortError'
            ? 'Webhook timed out'
            : 'Webhook request failed',
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
