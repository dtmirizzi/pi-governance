import { describe, it, expect } from 'vitest';
import { SECRET_PATTERNS, PII_PATTERNS } from '../../../src/lib/dlp/patterns.js';
import type { DlpPatternDef } from '../../../src/lib/dlp/patterns.js';

describe('DLP Patterns', () => {
  // ---------------------------------------------------------------------------
  // Pattern array structure
  // ---------------------------------------------------------------------------
  describe('pattern array structure', () => {
    it('SECRET_PATTERNS is a non-empty array', () => {
      expect(Array.isArray(SECRET_PATTERNS)).toBe(true);
      expect(SECRET_PATTERNS.length).toBeGreaterThanOrEqual(10);
    });

    it('PII_PATTERNS is a non-empty array', () => {
      expect(Array.isArray(PII_PATTERNS)).toBe(true);
      expect(PII_PATTERNS.length).toBeGreaterThanOrEqual(5);
    });

    it('all SECRET_PATTERNS are well-formed DlpPatternDef', () => {
      for (const p of SECRET_PATTERNS) {
        expect(p.name).toBeTruthy();
        expect(p.pattern).toBeInstanceOf(RegExp);
        expect(['low', 'medium', 'high', 'critical']).toContain(p.severity);
        expect(p.category).toBe('secret');
      }
    });

    it('all PII_PATTERNS are well-formed DlpPatternDef', () => {
      for (const p of PII_PATTERNS) {
        expect(p.name).toBeTruthy();
        expect(p.pattern).toBeInstanceOf(RegExp);
        expect(['low', 'medium', 'high', 'critical']).toContain(p.severity);
        expect(p.category).toBe('pii');
      }
    });

    it('no duplicate names across all patterns', () => {
      const allPatterns: DlpPatternDef[] = [...SECRET_PATTERNS, ...PII_PATTERNS];
      const names = allPatterns.map((p) => p.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  // ---------------------------------------------------------------------------
  // Secret pattern matching
  // ---------------------------------------------------------------------------
  describe('secret pattern matching', () => {
    it('detects AWS access key', () => {
      const text = 'AWS key: AKIAIOSFODNN7EXAMPLE';
      const p = SECRET_PATTERNS.find((p) => p.name === 'aws_access_key')!;
      expect(p.pattern.test(text)).toBe(true);
    });

    it('detects GitHub PAT', () => {
      const text = 'token: ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh1234';
      const p = SECRET_PATTERNS.find((p) => p.name === 'github_pat')!;
      expect(new RegExp(p.pattern.source, p.pattern.flags).test(text)).toBe(true);
    });

    it('detects Anthropic API key', () => {
      const text = 'key: sk-ant-api03-' + 'a'.repeat(93);
      const p = SECRET_PATTERNS.find((p) => p.name === 'anthropic_api_key')!;
      expect(new RegExp(p.pattern.source, p.pattern.flags).test(text)).toBe(true);
    });

    it('detects JWT token', () => {
      const text = 'auth: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc123def456ghi789';
      const p = SECRET_PATTERNS.find((p) => p.name === 'jwt_token')!;
      expect(new RegExp(p.pattern.source, p.pattern.flags).test(text)).toBe(true);
    });

    it('detects private key header', () => {
      const text = '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIB...';
      const p = SECRET_PATTERNS.find((p) => p.name === 'private_key')!;
      expect(new RegExp(p.pattern.source, p.pattern.flags).test(text)).toBe(true);
    });

    it('detects database URL', () => {
      const text = 'DB=postgres://user:password@host:5432/mydb';
      const p = SECRET_PATTERNS.find((p) => p.name === 'database_url')!;
      expect(new RegExp(p.pattern.source, p.pattern.flags).test(text)).toBe(true);
    });

    it('detects Slack token', () => {
      const text = 'SLACK_TOKEN=xoxb-1234567890-abcdefghij';
      const p = SECRET_PATTERNS.find((p) => p.name === 'slack_token')!;
      expect(new RegExp(p.pattern.source, p.pattern.flags).test(text)).toBe(true);
    });

    it('detects Stripe key', () => {
      // Use sk_test_ prefix to avoid GitHub push protection triggering on sk_live_
      const text = 'sk_test_' + 'A'.repeat(24);
      const p = SECRET_PATTERNS.find((p) => p.name === 'stripe_key')!;
      expect(new RegExp(p.pattern.source, p.pattern.flags).test(text)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // PII pattern matching
  // ---------------------------------------------------------------------------
  describe('PII pattern matching', () => {
    it('detects SSN', () => {
      const text = 'SSN: 123-45-6789';
      const p = PII_PATTERNS.find((p) => p.name === 'ssn')!;
      expect(new RegExp(p.pattern.source, p.pattern.flags).test(text)).toBe(true);
    });

    it('detects Visa credit card', () => {
      const text = 'Card: 4111 1111 1111 1111';
      const p = PII_PATTERNS.find((p) => p.name === 'credit_card')!;
      expect(new RegExp(p.pattern.source, p.pattern.flags).test(text)).toBe(true);
    });

    it('detects email address', () => {
      const text = 'Email: alice@example.com';
      const p = PII_PATTERNS.find((p) => p.name === 'email')!;
      expect(new RegExp(p.pattern.source, p.pattern.flags).test(text)).toBe(true);
    });

    it('detects US phone number', () => {
      const text = 'Phone: (555) 123-4567';
      const p = PII_PATTERNS.find((p) => p.name === 'phone_us')!;
      expect(new RegExp(p.pattern.source, p.pattern.flags).test(text)).toBe(true);
    });

    it('detects IPv4 address', () => {
      const text = 'Server: 192.168.1.100';
      const p = PII_PATTERNS.find((p) => p.name === 'ipv4')!;
      expect(new RegExp(p.pattern.source, p.pattern.flags).test(text)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // False positive resistance
  // ---------------------------------------------------------------------------
  describe('false positive resistance', () => {
    it('SSN pattern does not match dates like 2024-01-15', () => {
      const text = 'Date: 2024-01-15';
      const p = PII_PATTERNS.find((p) => p.name === 'ssn')!;
      // SSN is \d{3}-\d{2}-\d{4}, date is \d{4}-\d{2}-\d{2} — different group sizes
      const re = new RegExp(p.pattern.source, p.pattern.flags);
      const match = re.exec(text);
      // 2024-01-15 should not match: first group is 4 digits, SSN requires exactly 3
      expect(match).toBeNull();
    });

    it('IPv4 does not match version strings like 1.2.3', () => {
      const text = 'version: 1.2.3';
      const p = PII_PATTERNS.find((p) => p.name === 'ipv4')!;
      const re = new RegExp(p.pattern.source, p.pattern.flags);
      expect(re.test(text)).toBe(false);
    });
  });
});
