import { createHash } from 'node:crypto';
import type { DlpMatch } from './scanner.js';

export interface MaskingConfig {
  strategy: 'partial' | 'full' | 'hash';
  show_chars: number;
  placeholder: string;
}

const DEFAULT_CONFIG: MaskingConfig = {
  strategy: 'partial',
  show_chars: 4,
  placeholder: '***',
};

export class DlpMasker {
  private config: MaskingConfig;

  constructor(config?: Partial<MaskingConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  maskValue(value: string): string {
    switch (this.config.strategy) {
      case 'full':
        return this.config.placeholder;
      case 'hash': {
        const hash = createHash('sha256').update(value).digest('hex').slice(0, 8);
        return `[REDACTED:${hash}]`;
      }
      case 'partial':
      default: {
        if (value.length <= this.config.show_chars) {
          return this.config.placeholder;
        }
        return this.config.placeholder + value.slice(-this.config.show_chars);
      }
    }
  }

  maskText(text: string, matches: DlpMatch[]): string {
    if (matches.length === 0) return text;

    // Sort by position descending to avoid index shifting
    const sorted = [...matches].sort((a, b) => b.start - a.start);

    let result = text;
    for (const match of sorted) {
      const masked = this.maskValue(match.matched);
      result = result.slice(0, match.start) + masked + result.slice(match.end);
    }
    return result;
  }
}
