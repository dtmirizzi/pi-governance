import { randomUUID } from 'node:crypto';
import type { AuditRecord, AuditEventType } from './schema.js';
import type { AuditSink } from './sinks/sink.js';
import { JsonlAuditSink } from './sinks/jsonl.js';
import { WebhookAuditSink } from './sinks/webhook.js';

interface AuditSinkConfig {
  type: 'jsonl' | 'webhook' | 'postgres';
  path?: string;
  url?: string;
  connection?: string;
}

interface AuditConfig {
  sinks: AuditSinkConfig[];
}

export class AuditLogger {
  private sinks: AuditSink[];
  private counts: Map<AuditEventType, number> = new Map();

  constructor(config?: AuditConfig) {
    const sinkConfigs = config?.sinks ?? [
      { type: 'jsonl' as const, path: '~/.pi/agent/audit.jsonl' },
    ];
    this.sinks = [];

    for (const sc of sinkConfigs) {
      if (sc.type === 'jsonl') {
        this.sinks.push(new JsonlAuditSink(sc.path ?? '~/.pi/agent/audit.jsonl'));
      } else if (sc.type === 'webhook' && sc.url) {
        this.sinks.push(new WebhookAuditSink(sc.url));
      }
      // postgres: skip for now
    }

    // Ensure at least one sink
    if (this.sinks.length === 0) {
      this.sinks.push(new JsonlAuditSink('~/.pi/agent/audit.jsonl'));
    }
  }

  async log(record: Omit<AuditRecord, 'id' | 'timestamp'>): Promise<void> {
    const full: AuditRecord = {
      ...record,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    };

    this.counts.set(full.event, (this.counts.get(full.event) ?? 0) + 1);

    await Promise.all(this.sinks.map((s) => s.write(full as unknown as Record<string, unknown>)));
  }

  async flush(): Promise<void> {
    await Promise.all(this.sinks.map((s) => s.flush()));
  }

  getSummary(): Map<AuditEventType, number> {
    return new Map(this.counts);
  }
}
