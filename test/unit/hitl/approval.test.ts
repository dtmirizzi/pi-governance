import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CliApprover } from '../../../src/lib/hitl/cli-approver.js';
import { WebhookApprover } from '../../../src/lib/hitl/webhook-approver.js';
import { createApprovalFlow } from '../../../src/lib/hitl/approval.js';
import type { ConfirmUI, GovernanceToolCall } from '../../../src/lib/hitl/approval.js';

const mockToolCall: GovernanceToolCall = {
  toolName: 'bash',
  input: { command: 'npm test' },
};

const mockContext = { userId: 'alice', role: 'project_lead', orgUnit: 'engineering' };

describe('CliApprover', () => {
  it('returns approved when user confirms', async () => {
    const ui: ConfirmUI = { confirm: vi.fn().mockResolvedValue(true) };
    const approver = new CliApprover(ui);

    const result = await approver.requestApproval(mockToolCall, mockContext);

    expect(result.approved).toBe(true);
    expect(result.approver).toBe('cli');
    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(ui.confirm).toHaveBeenCalledWith(
      expect.stringContaining('bash'),
      expect.stringContaining('alice'),
      expect.objectContaining({ timeout: 300_000 }),
    );
  });

  it('returns denied when user rejects', async () => {
    const ui: ConfirmUI = { confirm: vi.fn().mockResolvedValue(false) };
    const approver = new CliApprover(ui);

    const result = await approver.requestApproval(mockToolCall, mockContext);

    expect(result.approved).toBe(false);
    expect(result.reason).toBe('Denied by user');
  });

  it('returns denied on timeout/error', async () => {
    const ui: ConfirmUI = { confirm: vi.fn().mockRejectedValue(new Error('timeout')) };
    const approver = new CliApprover(ui, 10);

    const result = await approver.requestApproval(mockToolCall, mockContext);

    expect(result.approved).toBe(false);
    expect(result.reason).toBe('Approval timed out');
  });

  it('uses custom timeout', async () => {
    const ui: ConfirmUI = { confirm: vi.fn().mockResolvedValue(true) };
    const approver = new CliApprover(ui, 60);

    await approver.requestApproval(mockToolCall, mockContext);

    expect(ui.confirm).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ timeout: 60_000 }),
    );
  });

  it('formats input summary in message', async () => {
    const ui: ConfirmUI = { confirm: vi.fn().mockResolvedValue(true) };
    const approver = new CliApprover(ui);

    await approver.requestApproval(
      { toolName: 'write', input: { path: '/tmp/test.ts', content: 'hello' } },
      mockContext,
    );

    const message = (ui.confirm as ReturnType<typeof vi.fn>).mock.calls[0]![1] as string;
    expect(message).toContain('path:');
    expect(message).toContain('/tmp/test.ts');
  });
});

describe('WebhookApprover', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns approved when webhook approves', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ approved: true }),
    });

    const approver = new WebhookApprover('http://localhost:9999/approve');
    const result = await approver.requestApproval(mockToolCall, mockContext);

    expect(result.approved).toBe(true);
    expect(result.approver).toBe('webhook');
  });

  it('returns denied when webhook denies', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ approved: false, reason: 'Too risky' }),
    });

    const approver = new WebhookApprover('http://localhost:9999/approve');
    const result = await approver.requestApproval(mockToolCall, mockContext);

    expect(result.approved).toBe(false);
    expect(result.reason).toBe('Too risky');
  });

  it('returns denied on HTTP error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    const approver = new WebhookApprover('http://localhost:9999/approve');
    const result = await approver.requestApproval(mockToolCall, mockContext);

    expect(result.approved).toBe(false);
    expect(result.reason).toContain('500');
  });

  it('returns denied on network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const approver = new WebhookApprover('http://localhost:9999/approve');
    const result = await approver.requestApproval(mockToolCall, mockContext);

    expect(result.approved).toBe(false);
    expect(result.reason).toBe('Webhook request failed');
  });

  it('returns denied on timeout (AbortError)', async () => {
    const abortError = new DOMException('The operation was aborted', 'AbortError');
    globalThis.fetch = vi.fn().mockRejectedValue(abortError);

    const approver = new WebhookApprover('http://localhost:9999/approve', 1);
    const result = await approver.requestApproval(mockToolCall, mockContext);

    expect(result.approved).toBe(false);
    expect(result.reason).toBe('Webhook timed out');
  });

  it('sends correct payload', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ approved: true }),
    });
    globalThis.fetch = mockFetch;

    const approver = new WebhookApprover('http://localhost:9999/approve');
    await approver.requestApproval(mockToolCall, mockContext);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:9999/approve',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolCall: { toolName: 'bash', input: { command: 'npm test' } },
          context: mockContext,
        }),
      }),
    );
  });
});

describe('createApprovalFlow', () => {
  it('creates CliApprover for cli channel', () => {
    const ui: ConfirmUI = { confirm: vi.fn() };
    const flow = createApprovalFlow(
      { default_mode: 'supervised', approval_channel: 'cli', timeout_seconds: 60 },
      ui,
    );
    expect(flow).toBeInstanceOf(CliApprover);
  });

  it('creates WebhookApprover for webhook channel', () => {
    const flow = createApprovalFlow({
      default_mode: 'supervised',
      approval_channel: 'webhook',
      timeout_seconds: 60,
      webhook: { url: 'http://localhost:9999/approve' },
    });
    expect(flow).toBeInstanceOf(WebhookApprover);
  });

  it('throws when cli channel but no UI provided', () => {
    expect(() =>
      createApprovalFlow({
        default_mode: 'supervised',
        approval_channel: 'cli',
        timeout_seconds: 60,
      }),
    ).toThrow('ConfirmUI');
  });

  it('falls back to cli when webhook channel but no url', () => {
    const ui: ConfirmUI = { confirm: vi.fn() };
    const flow = createApprovalFlow(
      { default_mode: 'supervised', approval_channel: 'webhook', timeout_seconds: 60 },
      ui,
    );
    // Should fall back to CLI since no webhook URL
    expect(flow).toBeInstanceOf(CliApprover);
  });
});
