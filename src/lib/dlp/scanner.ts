import { SECRET_PATTERNS, PII_PATTERNS } from './patterns.js';
import type { DlpPatternDef, DlpSeverity, DlpCategory } from './patterns.js';

export type DlpAction = 'audit' | 'mask' | 'block';

export interface DlpMatch {
  patternName: string;
  category: DlpCategory;
  severity: DlpSeverity;
  start: number;
  end: number;
  matched: string;
}

export interface DlpScanResult {
  hasMatches: boolean;
  matches: DlpMatch[];
}

export interface DlpCustomPattern {
  name: string;
  pattern: string;
  severity: DlpSeverity;
  action?: DlpAction;
}

export interface DlpAllowlistEntry {
  pattern: string;
}

export interface DlpScannerConfig {
  enabled: boolean;
  mode: DlpAction;
  on_input?: DlpAction;
  on_output?: DlpAction;
  severity_threshold: DlpSeverity;
  built_in: { secrets: boolean; pii: boolean };
  custom_patterns: DlpCustomPattern[];
  allowlist: DlpAllowlistEntry[];
  pattern_overrides: Map<string, DlpAction>;
}

const SEVERITY_ORDER: Record<DlpSeverity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

interface CompiledPattern {
  def: DlpPatternDef;
  action?: DlpAction;
}

export class DlpScanner {
  private patterns: CompiledPattern[];
  private allowlistRegexps: RegExp[];
  private severityThreshold: number;
  private config: DlpScannerConfig;

  constructor(config: DlpScannerConfig) {
    this.config = config;
    this.severityThreshold = SEVERITY_ORDER[config.severity_threshold];
    this.patterns = [];
    this.allowlistRegexps = [];

    // Compile built-in patterns
    if (config.built_in.secrets) {
      for (const def of SECRET_PATTERNS) {
        this.patterns.push({ def });
      }
    }
    if (config.built_in.pii) {
      for (const def of PII_PATTERNS) {
        this.patterns.push({ def });
      }
    }

    // Compile custom patterns
    for (const cp of config.custom_patterns) {
      const def: DlpPatternDef = {
        name: cp.name,
        pattern: new RegExp(cp.pattern, 'g'),
        severity: cp.severity,
        category: 'custom',
      };
      this.patterns.push({ def, action: cp.action });
    }

    // Compile pattern overrides from config
    for (const compiled of this.patterns) {
      const override = config.pattern_overrides.get(compiled.def.name);
      if (override) {
        compiled.action = override;
      }
    }

    // Compile allowlist
    for (const entry of config.allowlist) {
      this.allowlistRegexps.push(new RegExp(entry.pattern));
    }
  }

  scan(text: string): DlpScanResult {
    if (!this.config.enabled || text.length === 0) {
      return { hasMatches: false, matches: [] };
    }

    const matches: DlpMatch[] = [];

    for (const compiled of this.patterns) {
      // Skip patterns below severity threshold
      if (SEVERITY_ORDER[compiled.def.severity] < this.severityThreshold) {
        continue;
      }

      // Reset the regex (global flag means lastIndex needs reset)
      const regex = new RegExp(compiled.def.pattern.source, compiled.def.pattern.flags);

      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        // Use the first capturing group if present, otherwise the full match
        const matched = match[1] ?? match[0];
        const start = match[1] ? match.index + match[0].indexOf(match[1]) : match.index;
        const end = start + matched.length;

        // Check allowlist
        if (this.isAllowlisted(matched)) {
          continue;
        }

        matches.push({
          patternName: compiled.def.name,
          category: compiled.def.category,
          severity: compiled.def.severity,
          start,
          end,
          matched,
        });
      }
    }

    return { hasMatches: matches.length > 0, matches };
  }

  getAction(direction: 'input' | 'output'): DlpAction {
    if (direction === 'input' && this.config.on_input) {
      return this.config.on_input;
    }
    if (direction === 'output' && this.config.on_output) {
      return this.config.on_output;
    }
    return this.config.mode;
  }

  getPatternAction(match: DlpMatch, direction: 'input' | 'output'): DlpAction {
    // Check per-pattern override first
    const compiled = this.patterns.find((p) => p.def.name === match.patternName);
    if (compiled?.action) {
      return compiled.action;
    }

    // Fall back to directional override or global mode
    return this.getAction(direction);
  }

  private isAllowlisted(value: string): boolean {
    for (const re of this.allowlistRegexps) {
      if (re.test(value)) return true;
    }
    return false;
  }
}

export function compareSeverity(a: DlpSeverity, b: DlpSeverity): number {
  return SEVERITY_ORDER[a] - SEVERITY_ORDER[b];
}
