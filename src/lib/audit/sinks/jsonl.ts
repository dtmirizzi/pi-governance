import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { homedir } from 'node:os';
import type { AuditSink } from './sink.js';

export class JsonlAuditSink implements AuditSink {
  private path: string;
  private buffer: Record<string, unknown>[] = [];
  private readonly flushThreshold = 10;

  constructor(path: string) {
    this.path = path.replace(/^~/, homedir());
  }

  async write(record: Record<string, unknown>): Promise<void> {
    this.buffer.push(record);
    if (this.buffer.length >= this.flushThreshold) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const lines = this.buffer.map((r) => JSON.stringify(r)).join('\n') + '\n';
    this.buffer = [];
    await mkdir(dirname(this.path), { recursive: true });
    await appendFile(this.path, lines, 'utf-8');
  }
}
