export { type GovernanceConfig } from './lib/config/schema.js';
export { loadConfig, ConfigValidationError } from './lib/config/loader.js';
export {
  type PolicyEngine,
  type PolicyDecision,
  type PathOperation,
  type ExecutionMode,
  type BashOverrides,
} from './lib/policy/engine.js';
export { type IdentityProvider, type ResolvedIdentity } from './lib/identity/provider.js';
export { type FactStore, type RoleBinding, type Relation } from './lib/facts/store.js';
export { type BashClassification } from './lib/bash/classifier.js';
export { type AuditSink } from './lib/audit/sinks/sink.js';
