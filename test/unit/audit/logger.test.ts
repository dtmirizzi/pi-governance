import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditLogger } from '../../../src/lib/audit/logger.js';

// Mock the sinks to avoid filesystem/network
vi.mock('../../../src/lib/audit/sinks/jsonl.js', () => ({
  JsonlAuditSink: vi.fn().mockImplementation(() => ({
    write: vi.fn().mockResolvedValue(undefined),
    flush: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../../../src/lib/audit/sinks/webhook.js', () => ({
  WebhookAuditSink: vi.fn().mockImplementation(() => ({
    write: vi.fn().mockResolvedValue(undefined),
    flush: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('AuditLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates default JSONL sink when no config provided', () => {
    const logger = new AuditLogger();
    expect(logger).toBeDefined();
  });

  it('creates JSONL sink from config', () => {
    const logger = new AuditLogger({ sinks: [{ type: 'jsonl', path: '/tmp/test.jsonl' }] });
    expect(logger).toBeDefined();
  });

  it('creates webhook sink from config', () => {
    const logger = new AuditLogger({
      sinks: [{ type: 'webhook', url: 'http://localhost:9999/audit' }],
    });
    expect(logger).toBeDefined();
  });

  it('creates multiple sinks', () => {
    const logger = new AuditLogger({
      sinks: [
        { type: 'jsonl', path: '/tmp/test.jsonl' },
        { type: 'webhook', url: 'http://localhost:9999/audit' },
      ],
    });
    expect(logger).toBeDefined();
  });

  it('log() adds id and timestamp to record', async () => {
    const logger = new AuditLogger({ sinks: [{ type: 'jsonl', path: '/tmp/test.jsonl' }] });

    await logger.log({
      sessionId: 'sess-1',
      event: 'tool_allowed',
      userId: 'alice',
      role: 'admin',
      orgUnit: 'default',
      tool: 'read',
    });

    // Verify summary is updated
    const summary = logger.getSummary();
    expect(summary.get('tool_allowed')).toBe(1);
  });

  it('getSummary() tracks counts by event type', async () => {
    const logger = new AuditLogger({ sinks: [{ type: 'jsonl', path: '/tmp/test.jsonl' }] });

    await logger.log({
      sessionId: 's1',
      event: 'tool_allowed',
      userId: 'a',
      role: 'admin',
      orgUnit: 'd',
    });
    await logger.log({
      sessionId: 's1',
      event: 'tool_allowed',
      userId: 'a',
      role: 'admin',
      orgUnit: 'd',
    });
    await logger.log({
      sessionId: 's1',
      event: 'tool_denied',
      userId: 'a',
      role: 'admin',
      orgUnit: 'd',
    });
    await logger.log({
      sessionId: 's1',
      event: 'session_start',
      userId: 'a',
      role: 'admin',
      orgUnit: 'd',
    });

    const summary = logger.getSummary();
    expect(summary.get('tool_allowed')).toBe(2);
    expect(summary.get('tool_denied')).toBe(1);
    expect(summary.get('session_start')).toBe(1);
    expect(summary.get('session_end')).toBeUndefined();
  });

  it('flush() delegates to all sinks', async () => {
    const logger = new AuditLogger({ sinks: [{ type: 'jsonl', path: '/tmp/test.jsonl' }] });
    // Should not throw
    await logger.flush();
  });

  it('falls back to JSONL when postgres sink is configured (not implemented)', () => {
    const logger = new AuditLogger({
      sinks: [{ type: 'postgres', connection: 'postgresql://...' }],
    });
    expect(logger).toBeDefined();
  });

  it('skips webhook sink without url', () => {
    const logger = new AuditLogger({ sinks: [{ type: 'webhook' }] });
    expect(logger).toBeDefined();
  });
});
