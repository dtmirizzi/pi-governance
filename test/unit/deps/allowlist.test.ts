import { describe, it, expect } from 'vitest';
import {
  buildAllowBlockLists,
  isAllowlisted,
  isBlocklisted,
  DEFAULT_NPM_ALLOWLIST,
  DEFAULT_PYPI_ALLOWLIST,
  DEFAULT_BLOCKLIST_EXACT,
  DEFAULT_BLOCKLIST_PATTERNS,
} from '../../../src/lib/deps/allowlist.js';

describe('default lists', () => {
  it('has npm allowlist entries', () => {
    expect(DEFAULT_NPM_ALLOWLIST.length).toBeGreaterThan(50);
    expect(DEFAULT_NPM_ALLOWLIST).toContain('express');
    expect(DEFAULT_NPM_ALLOWLIST).toContain('react');
    expect(DEFAULT_NPM_ALLOWLIST).toContain('lodash');
  });

  it('has pypi allowlist entries', () => {
    expect(DEFAULT_PYPI_ALLOWLIST.length).toBeGreaterThan(30);
    expect(DEFAULT_PYPI_ALLOWLIST).toContain('requests');
    expect(DEFAULT_PYPI_ALLOWLIST).toContain('flask');
    expect(DEFAULT_PYPI_ALLOWLIST).toContain('numpy');
  });

  it('has blocklist entries', () => {
    expect(DEFAULT_BLOCKLIST_EXACT).toContain('crossenv');
    expect(DEFAULT_BLOCKLIST_EXACT).toContain('colourama');
  });

  it('has blocklist patterns', () => {
    expect(DEFAULT_BLOCKLIST_PATTERNS.length).toBeGreaterThan(5);
    expect(DEFAULT_BLOCKLIST_PATTERNS.some((p) => p.test('foo-crack'))).toBe(true);
    expect(DEFAULT_BLOCKLIST_PATTERNS.some((p) => p.test('bar-keygen'))).toBe(true);
  });
});

describe('buildAllowBlockLists', () => {
  it('merges user and default lists for npm', () => {
    const lists = buildAllowBlockLists('npm', ['my-pkg'], ['bad-pkg'], ['^evil-']);
    expect(lists.allowlist).toContain('express');
    expect(lists.allowlist).toContain('my-pkg');
    expect(lists.blocklist).toContain('crossenv');
    expect(lists.blocklist).toContain('bad-pkg');
    expect(lists.blocklistPatterns.some((p) => p.test('evil-thing'))).toBe(true);
  });

  it('uses empty base for crates.io', () => {
    const lists = buildAllowBlockLists('crates.io', [], [], []);
    // Only default blocklist, no allowlist base
    expect(lists.blocklist.length).toBe(DEFAULT_BLOCKLIST_EXACT.length);
  });
});

describe('isAllowlisted', () => {
  it('returns true for listed packages', () => {
    expect(isAllowlisted('express', ['express', 'react'])).toBe(true);
  });

  it('returns false for unlisted packages', () => {
    expect(isAllowlisted('unknown', ['express', 'react'])).toBe(false);
  });
});

describe('isBlocklisted', () => {
  it('returns true for exact matches', () => {
    expect(isBlocklisted('crossenv', ['crossenv'], [])).toBe(true);
  });

  it('returns true for pattern matches', () => {
    expect(isBlocklisted('foo-crack', [], [/-crack$/])).toBe(true);
  });

  it('returns false for non-matching names', () => {
    expect(isBlocklisted('express', ['crossenv'], [/-crack$/])).toBe(false);
  });
});
