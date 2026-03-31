export type AuditEventType =
  | 'session_start'
  | 'session_end'
  | 'tool_allowed'
  | 'tool_denied'
  | 'tool_dry_run'
  | 'tool_result'
  | 'bash_denied'
  | 'path_denied'
  | 'approval_requested'
  | 'approval_granted'
  | 'approval_denied'
  | 'budget_exceeded'
  | 'config_reloaded'
  | 'dlp_blocked'
  | 'dlp_detected'
  | 'dlp_masked'
  | 'config_tampered'
  | 'dep_allowed'
  | 'dep_blocked'
  | 'dep_escalated'
  | 'dep_approved'
  | 'dep_rejected';

export interface AuditRecord {
  id: string;
  timestamp: string;
  sessionId: string;
  event: AuditEventType;
  userId: string;
  role: string;
  orgUnit: string;
  tool?: string;
  input?: Record<string, unknown>;
  decision?: string;
  reason?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}
