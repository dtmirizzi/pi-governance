export {
  SECRET_PATTERNS,
  PII_PATTERNS,
  type DlpPatternDef,
  type DlpSeverity,
  type DlpCategory,
} from './patterns.js';

export {
  DlpScanner,
  compareSeverity,
  type DlpAction,
  type DlpMatch,
  type DlpScanResult,
  type DlpScannerConfig,
  type DlpCustomPattern,
  type DlpAllowlistEntry,
} from './scanner.js';

export { DlpMasker, type MaskingConfig } from './masker.js';
