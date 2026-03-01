export interface AuditSink {
  write(record: Record<string, unknown>): Promise<void>;
  flush(): Promise<void>;
}
