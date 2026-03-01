// Config
export { type GovernanceConfig } from './lib/config/schema.js';
export { loadConfig, ConfigValidationError } from './lib/config/loader.js';

// Policy engine
export {
  type PolicyEngine,
  type PolicyDecision,
  type PathOperation,
  type ExecutionMode,
  type BashOverrides,
} from './lib/policy/engine.js';
export { YamlPolicyEngine, type YamlRules, type YamlRole } from './lib/policy/yaml-engine.js';
export { createPolicyEngine } from './lib/policy/factory.js';

// Identity
export { type IdentityProvider, type ResolvedIdentity } from './lib/identity/provider.js';
export { EnvIdentityProvider } from './lib/identity/env-provider.js';
export { LocalIdentityProvider } from './lib/identity/local-provider.js';
export { IdentityChain, createIdentityChain } from './lib/identity/chain.js';

// Facts / permissions
export { type FactStore, type RoleBinding, type Relation } from './lib/facts/store.js';
export { YamlFactStore } from './lib/facts/yaml-store.js';
export { OsoMemoryFactStore } from './lib/facts/oso-memory-store.js';

// Bash security
export { type BashClassification, BashClassifier } from './lib/bash/classifier.js';
export { SAFE_PATTERNS, DANGEROUS_PATTERNS } from './lib/bash/patterns.js';

// DLP (Data Loss Prevention)
export {
  DlpScanner,
  DlpMasker,
  SECRET_PATTERNS as DLP_SECRET_PATTERNS,
  PII_PATTERNS as DLP_PII_PATTERNS,
  compareSeverity,
  type DlpAction,
  type DlpMatch,
  type DlpScanResult,
  type DlpScannerConfig,
  type DlpCustomPattern,
  type DlpAllowlistEntry,
  type DlpPatternDef,
  type DlpSeverity,
  type DlpCategory,
  type MaskingConfig,
} from './lib/dlp/index.js';

// Budget
export { BudgetTracker } from './lib/budget/tracker.js';

// Config watcher
export { ConfigWatcher } from './lib/config/watcher.js';

// Templates
export { TemplateSelector, type TemplateSelectorConfig } from './lib/templates/selector.js';
export { render as renderTemplate } from './lib/templates/renderer.js';

// Audit
export { type AuditSink } from './lib/audit/sinks/sink.js';
export { type AuditRecord, type AuditEventType } from './lib/audit/schema.js';
export { AuditLogger } from './lib/audit/logger.js';
export { JsonlAuditSink } from './lib/audit/sinks/jsonl.js';
export { WebhookAuditSink } from './lib/audit/sinks/webhook.js';

// HITL
export {
  type ApprovalFlow,
  type ApprovalResult,
  type GovernanceToolCall,
  type ConfirmUI,
  type HitlConfig,
  createApprovalFlow,
} from './lib/hitl/approval.js';
export { CliApprover } from './lib/hitl/cli-approver.js';
export { WebhookApprover } from './lib/hitl/webhook-approver.js';
