import { describe, it, expect } from 'vitest';
import { DlpScanner } from '../../../src/lib/dlp/scanner.js';
import type { DlpScannerConfig, DlpAction } from '../../../src/lib/dlp/scanner.js';

function makeConfig(overrides?: Partial<DlpScannerConfig>): DlpScannerConfig {
  return {
    enabled: true,
    mode: 'audit',
    severity_threshold: 'low',
    built_in: { secrets: true, pii: true },
    custom_patterns: [],
    allowlist: [],
    pattern_overrides: new Map(),
    ...overrides,
  };
}

describe('DlpScanner', () => {
  // ---------------------------------------------------------------------------
  // Detection
  // ---------------------------------------------------------------------------
  describe('detection', () => {
    it('finds AWS access key in text', () => {
      const scanner = new DlpScanner(makeConfig());
      const result = scanner.scan('AWS_KEY=AKIAIOSFODNN7EXAMPLE');
      expect(result.hasMatches).toBe(true);
      expect(result.matches.some((m) => m.patternName === 'aws_access_key')).toBe(true);
    });

    it('finds GitHub PAT in text', () => {
      const scanner = new DlpScanner(makeConfig());
      const result = scanner.scan('token=ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh1234');
      expect(result.hasMatches).toBe(true);
      expect(result.matches.some((m) => m.patternName === 'github_pat')).toBe(true);
    });

    it('finds SSN in text', () => {
      const scanner = new DlpScanner(makeConfig());
      const result = scanner.scan('SSN: 123-45-6789');
      expect(result.hasMatches).toBe(true);
      expect(result.matches.some((m) => m.patternName === 'ssn')).toBe(true);
    });

    it('finds email in text', () => {
      const scanner = new DlpScanner(makeConfig());
      const result = scanner.scan('contact: user@example.com');
      expect(result.hasMatches).toBe(true);
      expect(result.matches.some((m) => m.patternName === 'email')).toBe(true);
    });

    it('finds multiple matches in one string', () => {
      const scanner = new DlpScanner(makeConfig());
      const text = 'AKIAIOSFODNN7EXAMPLE and 123-45-6789';
      const result = scanner.scan(text);
      expect(result.hasMatches).toBe(true);
      expect(result.matches.length).toBeGreaterThanOrEqual(2);
    });

    it('returns correct positions', () => {
      const scanner = new DlpScanner(makeConfig());
      const text = 'key=AKIAIOSFODNN7EXAMPLE';
      const result = scanner.scan(text);
      const awsMatch = result.matches.find((m) => m.patternName === 'aws_access_key');
      expect(awsMatch).toBeDefined();
      expect(text.slice(awsMatch!.start, awsMatch!.end)).toBe('AKIAIOSFODNN7EXAMPLE');
    });
  });

  // ---------------------------------------------------------------------------
  // Scan result
  // ---------------------------------------------------------------------------
  describe('scan result', () => {
    it('returns hasMatches: false for clean text', () => {
      const scanner = new DlpScanner(makeConfig());
      const result = scanner.scan('This is perfectly clean text with no secrets.');
      expect(result.hasMatches).toBe(false);
      expect(result.matches).toHaveLength(0);
    });

    it('returns hasMatches: false for empty string', () => {
      const scanner = new DlpScanner(makeConfig());
      const result = scanner.scan('');
      expect(result.hasMatches).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Severity filtering
  // ---------------------------------------------------------------------------
  describe('severity filtering', () => {
    it('threshold high skips low/medium matches', () => {
      const scanner = new DlpScanner(makeConfig({ severity_threshold: 'high' }));
      // email is low severity, SSN is critical
      const result = scanner.scan('user@example.com and 123-45-6789');
      const names = result.matches.map((m) => m.patternName);
      expect(names).not.toContain('email');
      expect(names).toContain('ssn');
    });

    it('threshold critical only matches critical patterns', () => {
      const scanner = new DlpScanner(makeConfig({ severity_threshold: 'critical' }));
      const result = scanner.scan(
        'xoxb-1234567890-abcdefghij user@example.com AKIAIOSFODNN7EXAMPLE',
      );
      // slack_token is high (skipped), email is low (skipped), aws_access_key is critical (kept)
      const names = result.matches.map((m) => m.patternName);
      expect(names).not.toContain('slack_token');
      expect(names).not.toContain('email');
      expect(names).toContain('aws_access_key');
    });
  });

  // ---------------------------------------------------------------------------
  // Built-in toggle
  // ---------------------------------------------------------------------------
  describe('built-in toggle', () => {
    it('secrets: false disables secret patterns', () => {
      const scanner = new DlpScanner(makeConfig({ built_in: { secrets: false, pii: true } }));
      const result = scanner.scan('AKIAIOSFODNN7EXAMPLE and 123-45-6789');
      const categories = result.matches.map((m) => m.category);
      expect(categories).not.toContain('secret');
      expect(categories).toContain('pii');
    });

    it('pii: false disables PII patterns', () => {
      const scanner = new DlpScanner(makeConfig({ built_in: { secrets: true, pii: false } }));
      const result = scanner.scan('AKIAIOSFODNN7EXAMPLE and 123-45-6789');
      const categories = result.matches.map((m) => m.category);
      expect(categories).toContain('secret');
      expect(categories).not.toContain('pii');
    });
  });

  // ---------------------------------------------------------------------------
  // Custom patterns
  // ---------------------------------------------------------------------------
  describe('custom patterns', () => {
    it('detects custom pattern alongside built-ins', () => {
      const scanner = new DlpScanner(
        makeConfig({
          custom_patterns: [
            { name: 'internal_key', pattern: 'grwnd_[a-zA-Z0-9]{32}', severity: 'critical' },
          ],
        }),
      );
      const token = 'grwnd_' + 'a'.repeat(32);
      const result = scanner.scan(`key=${token} and AKIAIOSFODNN7EXAMPLE`);
      expect(result.matches.some((m) => m.patternName === 'internal_key')).toBe(true);
      expect(result.matches.some((m) => m.patternName === 'aws_access_key')).toBe(true);
    });

    it('preserves per-pattern action override on custom pattern', () => {
      const scanner = new DlpScanner(
        makeConfig({
          mode: 'audit',
          custom_patterns: [
            {
              name: 'internal_key',
              pattern: 'grwnd_[a-zA-Z0-9]{32}',
              severity: 'critical',
              action: 'block',
            },
          ],
        }),
      );
      const token = 'grwnd_' + 'a'.repeat(32);
      const result = scanner.scan(`key=${token}`);
      const match = result.matches.find((m) => m.patternName === 'internal_key')!;
      expect(scanner.getPatternAction(match, 'input')).toBe('block');
    });
  });

  // ---------------------------------------------------------------------------
  // Allowlist
  // ---------------------------------------------------------------------------
  describe('allowlist', () => {
    it('excludes allowlisted matches', () => {
      const scanner = new DlpScanner(
        makeConfig({
          allowlist: [{ pattern: '127\\.0\\.0\\.1' }],
        }),
      );
      const result = scanner.scan('server at 127.0.0.1');
      expect(result.matches.every((m) => m.matched !== '127.0.0.1')).toBe(true);
    });

    it('non-allowlisted values of same pattern type still detected', () => {
      const scanner = new DlpScanner(
        makeConfig({
          allowlist: [{ pattern: '127\\.0\\.0\\.1' }],
        }),
      );
      const result = scanner.scan('servers: 127.0.0.1 and 192.168.1.100');
      expect(result.matches.some((m) => m.matched === '192.168.1.100')).toBe(true);
    });

    it('allowlist applies to secret patterns too', () => {
      const scanner = new DlpScanner(
        makeConfig({
          allowlist: [{ pattern: 'EXAMPLE_KEY_.*' }],
        }),
      );
      // generic_api_key pattern: API_KEY=...
      const result = scanner.scan('API_KEY=EXAMPLE_KEY_placeholder');
      const genericMatch = result.matches.find((m) => m.patternName === 'generic_api_key');
      // If matched, the captured value should be checked against allowlist
      if (genericMatch) {
        expect(genericMatch.matched).not.toMatch(/^EXAMPLE_KEY_/);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Disabled scanner
  // ---------------------------------------------------------------------------
  describe('disabled scanner', () => {
    it('returns no matches when disabled', () => {
      const scanner = new DlpScanner(makeConfig({ enabled: false }));
      const result = scanner.scan('AKIAIOSFODNN7EXAMPLE 123-45-6789');
      expect(result.hasMatches).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Action resolution
  // ---------------------------------------------------------------------------
  describe('action resolution', () => {
    it('getAction returns on_input for input direction', () => {
      const scanner = new DlpScanner(
        makeConfig({ mode: 'audit', on_input: 'block', on_output: 'mask' }),
      );
      expect(scanner.getAction('input')).toBe('block');
    });

    it('getAction returns on_output for output direction', () => {
      const scanner = new DlpScanner(
        makeConfig({ mode: 'audit', on_input: 'block', on_output: 'mask' }),
      );
      expect(scanner.getAction('output')).toBe('mask');
    });

    it('getAction falls back to mode when no directional override', () => {
      const scanner = new DlpScanner(makeConfig({ mode: 'mask' }));
      expect(scanner.getAction('input')).toBe('mask');
      expect(scanner.getAction('output')).toBe('mask');
    });

    it('getPatternAction uses per-pattern override', () => {
      const scanner = new DlpScanner(
        makeConfig({
          mode: 'audit',
          pattern_overrides: new Map([['aws_access_key', 'block' as DlpAction]]),
        }),
      );
      const result = scanner.scan('AKIAIOSFODNN7EXAMPLE');
      const awsMatch = result.matches.find((m) => m.patternName === 'aws_access_key')!;
      expect(scanner.getPatternAction(awsMatch, 'input')).toBe('block');
    });

    it('getPatternAction falls back to directional action', () => {
      const scanner = new DlpScanner(makeConfig({ mode: 'audit', on_input: 'mask' }));
      const result = scanner.scan('AKIAIOSFODNN7EXAMPLE');
      const awsMatch = result.matches.find((m) => m.patternName === 'aws_access_key')!;
      expect(scanner.getPatternAction(awsMatch, 'input')).toBe('mask');
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------
  describe('edge cases', () => {
    it('handles very long text without error', () => {
      const scanner = new DlpScanner(makeConfig());
      const longText = 'x'.repeat(100000) + ' AKIAIOSFODNN7EXAMPLE ' + 'y'.repeat(100000);
      const result = scanner.scan(longText);
      expect(result.hasMatches).toBe(true);
    });

    it('scan can be called multiple times on same scanner', () => {
      const scanner = new DlpScanner(makeConfig());
      const r1 = scanner.scan('AKIAIOSFODNN7EXAMPLE');
      const r2 = scanner.scan('AKIAIOSFODNN7EXAMPLE');
      expect(r1.matches.length).toBe(r2.matches.length);
    });
  });
});
