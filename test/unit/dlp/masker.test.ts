import { describe, it, expect } from 'vitest';
import { DlpMasker } from '../../../src/lib/dlp/masker.js';
import type { DlpMatch } from '../../../src/lib/dlp/scanner.js';

function makeMatch(start: number, end: number, matched: string, patternName = 'test'): DlpMatch {
  return {
    patternName,
    category: 'secret',
    severity: 'high',
    start,
    end,
    matched,
  };
}

describe('DlpMasker', () => {
  // ---------------------------------------------------------------------------
  // maskValue — partial strategy
  // ---------------------------------------------------------------------------
  describe('maskValue — partial', () => {
    const masker = new DlpMasker({ strategy: 'partial', show_chars: 4, placeholder: '***' });

    it('shows last N chars for long values', () => {
      expect(masker.maskValue('ghp_ABCDEFGHabcdefgh1234')).toBe('***1234');
    });

    it('returns placeholder for values shorter than show_chars', () => {
      expect(masker.maskValue('abc')).toBe('***');
    });

    it('returns placeholder for values equal to show_chars', () => {
      expect(masker.maskValue('abcd')).toBe('***');
    });

    it('shows last char with show_chars=1', () => {
      const m = new DlpMasker({ strategy: 'partial', show_chars: 1 });
      expect(m.maskValue('secret')).toBe('***t');
    });
  });

  // ---------------------------------------------------------------------------
  // maskValue — full strategy
  // ---------------------------------------------------------------------------
  describe('maskValue — full', () => {
    const masker = new DlpMasker({ strategy: 'full', placeholder: '[REMOVED]' });

    it('returns placeholder regardless of value', () => {
      expect(masker.maskValue('ghp_ABCDEFGHabcdefgh1234')).toBe('[REMOVED]');
    });

    it('returns placeholder for short values', () => {
      expect(masker.maskValue('x')).toBe('[REMOVED]');
    });
  });

  // ---------------------------------------------------------------------------
  // maskValue — hash strategy
  // ---------------------------------------------------------------------------
  describe('maskValue — hash', () => {
    const masker = new DlpMasker({ strategy: 'hash' });

    it('returns [REDACTED:hex8] format', () => {
      const result = masker.maskValue('my-secret-value');
      expect(result).toMatch(/^\[REDACTED:[a-f0-9]{8}\]$/);
    });

    it('produces consistent hash for same value', () => {
      const a = masker.maskValue('same-value');
      const b = masker.maskValue('same-value');
      expect(a).toBe(b);
    });

    it('produces different hash for different values', () => {
      const a = masker.maskValue('value-a');
      const b = masker.maskValue('value-b');
      expect(a).not.toBe(b);
    });
  });

  // ---------------------------------------------------------------------------
  // maskText
  // ---------------------------------------------------------------------------
  describe('maskText', () => {
    const masker = new DlpMasker({ strategy: 'full', placeholder: '***' });

    it('masks single match in text', () => {
      const text = 'key: ghp_ABCDEF123456';
      const matches = [makeMatch(5, 21, 'ghp_ABCDEF123456')];
      expect(masker.maskText(text, matches)).toBe('key: ***');
    });

    it('masks multiple non-overlapping matches', () => {
      const text = 'a=SECRET1 b=SECRET2';
      const matches = [makeMatch(2, 9, 'SECRET1'), makeMatch(12, 19, 'SECRET2')];
      expect(masker.maskText(text, matches)).toBe('a=*** b=***');
    });

    it('masks match at start of text', () => {
      const text = 'SECRET rest of text';
      const matches = [makeMatch(0, 6, 'SECRET')];
      expect(masker.maskText(text, matches)).toBe('*** rest of text');
    });

    it('masks match at end of text', () => {
      const text = 'text then SECRET';
      const matches = [makeMatch(10, 16, 'SECRET')];
      expect(masker.maskText(text, matches)).toBe('text then ***');
    });

    it('returns original text when no matches', () => {
      const text = 'nothing sensitive here';
      expect(masker.maskText(text, [])).toBe(text);
    });

    it('handles adjacent matches correctly', () => {
      const text = 'AABB';
      const matches = [makeMatch(0, 2, 'AA'), makeMatch(2, 4, 'BB')];
      expect(masker.maskText(text, matches)).toBe('******');
    });
  });

  // ---------------------------------------------------------------------------
  // Default config
  // ---------------------------------------------------------------------------
  describe('default config', () => {
    it('uses partial strategy with show_chars=4 by default', () => {
      const masker = new DlpMasker();
      expect(masker.maskValue('1234567890')).toBe('***7890');
    });
  });
});
