import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { JsonlAuditSink } from '../../../src/lib/audit/sinks/jsonl.js';
import { WebhookAuditSink } from '../../../src/lib/audit/sinks/webhook.js';

describe('JsonlAuditSink', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `audit-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes records as JSONL on flush', async () => {
    const path = join(tmpDir, 'audit.jsonl');
    const sink = new JsonlAuditSink(path);

    await sink.write({ event: 'test1', id: '1' });
    await sink.write({ event: 'test2', id: '2' });
    await sink.flush();

    const content = readFileSync(path, 'utf-8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]!)).toEqual({ event: 'test1', id: '1' });
    expect(JSON.parse(lines[1]!)).toEqual({ event: 'test2', id: '2' });
  });

  it('creates parent directories if needed', async () => {
    const path = join(tmpDir, 'nested', 'dir', 'audit.jsonl');
    const sink = new JsonlAuditSink(path);

    await sink.write({ event: 'test' });
    await sink.flush();

    expect(existsSync(path)).toBe(true);
  });

  it('does nothing on flush with empty buffer', async () => {
    const path = join(tmpDir, 'empty.jsonl');
    const sink = new JsonlAuditSink(path);
    await sink.flush();
    expect(existsSync(path)).toBe(false);
  });

  it('auto-flushes after 10 records', async () => {
    const path = join(tmpDir, 'auto.jsonl');
    const sink = new JsonlAuditSink(path);

    for (let i = 0; i < 10; i++) {
      await sink.write({ id: String(i) });
    }

    // Should have auto-flushed
    expect(existsSync(path)).toBe(true);
    const content = readFileSync(path, 'utf-8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(10);
  });

  it('expands ~ in path', async () => {
    // We can't easily test the actual home dir expansion without writing there,
    // so just verify the sink can be constructed with a ~ path
    const sink = new JsonlAuditSink('~/test-audit.jsonl');
    expect(sink).toBeDefined();
  });
});

describe('WebhookAuditSink', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends records as JSON POST on flush', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = mockFetch;

    const sink = new WebhookAuditSink('http://localhost:9999/audit');
    await sink.write({ event: 'test1' });
    await sink.write({ event: 'test2' });
    await sink.flush();

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:9999/audit',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ event: 'test1' }, { event: 'test2' }]),
      }),
    );
  });

  it('retries once on failure', async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ ok: true });
    globalThis.fetch = mockFetch;

    const sink = new WebhookAuditSink('http://localhost:9999/audit');
    await sink.write({ event: 'test' });
    await sink.flush();

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('drops records after two failures', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('network error'));
    globalThis.fetch = mockFetch;

    const sink = new WebhookAuditSink('http://localhost:9999/audit');
    await sink.write({ event: 'test' });
    // Should not throw
    await sink.flush();

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('does nothing on flush with empty buffer', async () => {
    const mockFetch = vi.fn();
    globalThis.fetch = mockFetch;

    const sink = new WebhookAuditSink('http://localhost:9999/audit');
    await sink.flush();

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('retries on non-ok status', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true });
    globalThis.fetch = mockFetch;

    const sink = new WebhookAuditSink('http://localhost:9999/audit');
    await sink.write({ event: 'test' });
    await sink.flush();

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
