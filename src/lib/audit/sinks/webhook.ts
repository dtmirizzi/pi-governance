import type { AuditSink } from './sink.js';

export class WebhookAuditSink implements AuditSink {
  private url: string;
  private buffer: Record<string, unknown>[] = [];
  private readonly flushThreshold = 10;

  constructor(url: string) {
    this.url = url;
  }

  async write(record: Record<string, unknown>): Promise<void> {
    this.buffer.push(record);
    if (this.buffer.length >= this.flushThreshold) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const records = [...this.buffer];
    this.buffer = [];

    try {
      await this.send(records);
    } catch {
      // Retry once
      try {
        await this.send(records);
      } catch {
        // Drop records after second failure
      }
    }
  }

  private async send(records: Record<string, unknown>[]): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(records),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}
