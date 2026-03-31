import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  queryVulnerabilities,
  queryVulnerabilitiesBatch,
} from '../../../src/lib/deps/vulnerabilities.js';

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeOsvVuln(overrides: Record<string, unknown> = {}) {
  return {
    id: 'GHSA-1234-5678-9012',
    summary: 'XSS vulnerability in template engine',
    aliases: ['CVE-2024-1234'],
    severity: [{ type: 'CVSS_V3', score: '7.2' }],
    affected: [
      {
        ranges: [{ events: [{ introduced: '0' }, { fixed: '2.0.1' }] }],
      },
    ],
    ...overrides,
  };
}

describe('queryVulnerabilities', () => {
  it('returns vulnerabilities for a package', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        vulns: [makeOsvVuln()],
      }),
    });

    const result = await queryVulnerabilities('express', 'npm');

    expect(result.package).toBe('express');
    expect(result.ecosystem).toBe('npm');
    expect(result.vulnerabilities).toHaveLength(1);
    expect(result.vulnerabilities[0]!.id).toBe('GHSA-1234-5678-9012');
    expect(result.vulnerabilities[0]!.severity).toBe('high');
    expect(result.vulnerabilities[0]!.fixedIn).toBe('2.0.1');
    expect(result.vulnerabilities[0]!.aliases).toEqual(['CVE-2024-1234']);
  });

  it('returns empty array when no vulns found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const result = await queryVulnerabilities('safe-pkg', 'npm');
    expect(result.vulnerabilities).toHaveLength(0);
  });

  it('handles HTTP errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const result = await queryVulnerabilities('express', 'npm');
    expect(result.vulnerabilities).toHaveLength(0);
    expect(result.error).toContain('500');
  });

  it('handles network errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

    const result = await queryVulnerabilities('express', 'npm');
    expect(result.vulnerabilities).toHaveLength(0);
    expect(result.error).toBe('Connection refused');
  });

  it('includes version in query when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ vulns: [] }),
    });

    await queryVulnerabilities('express', 'npm', '4.17.0');

    const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
    expect(body.version).toBe('4.17.0');
  });

  it('parses critical severity (CVSS >= 9.0)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        vulns: [
          makeOsvVuln({
            severity: [{ type: 'CVSS_V3', score: '9.8' }],
          }),
        ],
      }),
    });

    const result = await queryVulnerabilities('critical-pkg', 'npm');
    expect(result.vulnerabilities[0]!.severity).toBe('critical');
  });

  it('parses medium severity (CVSS 4.0-6.9)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        vulns: [
          makeOsvVuln({
            severity: [{ type: 'CVSS_V3', score: '5.3' }],
          }),
        ],
      }),
    });

    const result = await queryVulnerabilities('medium-pkg', 'npm');
    expect(result.vulnerabilities[0]!.severity).toBe('medium');
  });

  it('parses low severity (CVSS < 4.0)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        vulns: [
          makeOsvVuln({
            severity: [{ type: 'CVSS_V3', score: '2.1' }],
          }),
        ],
      }),
    });

    const result = await queryVulnerabilities('low-pkg', 'npm');
    expect(result.vulnerabilities[0]!.severity).toBe('low');
  });

  it('defaults to medium when no CVSS_V3 severity', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        vulns: [makeOsvVuln({ severity: [{ type: 'CVSS_V2', score: '7.5' }] })],
      }),
    });

    const result = await queryVulnerabilities('no-v3-pkg', 'npm');
    expect(result.vulnerabilities[0]!.severity).toBe('medium');
  });

  it('defaults to medium when severity is missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        vulns: [makeOsvVuln({ severity: undefined })],
      }),
    });

    const result = await queryVulnerabilities('no-sev-pkg', 'npm');
    expect(result.vulnerabilities[0]!.severity).toBe('medium');
  });

  it('uses details when summary is missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        vulns: [makeOsvVuln({ summary: undefined, details: 'Detailed description of the issue' })],
      }),
    });

    const result = await queryVulnerabilities('no-summary-pkg', 'npm');
    expect(result.vulnerabilities[0]!.summary).toBe('Detailed description of the issue');
  });

  it('falls back to "No description" when both missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        vulns: [makeOsvVuln({ summary: undefined, details: undefined })],
      }),
    });

    const result = await queryVulnerabilities('no-desc-pkg', 'npm');
    expect(result.vulnerabilities[0]!.summary).toBe('No description');
  });

  it('handles missing fixed version', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        vulns: [makeOsvVuln({ affected: [] })],
      }),
    });

    const result = await queryVulnerabilities('no-fix-pkg', 'npm');
    expect(result.vulnerabilities[0]!.fixedIn).toBeUndefined();
  });

  it('maps ecosystem correctly for PyPI', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ vulns: [] }),
    });

    await queryVulnerabilities('requests', 'pypi');

    const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
    expect(body.package.ecosystem).toBe('PyPI');
  });

  it('maps ecosystem correctly for crates.io', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ vulns: [] }),
    });

    await queryVulnerabilities('serde', 'crates.io');

    const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
    expect(body.package.ecosystem).toBe('crates.io');
  });
});

describe('queryVulnerabilitiesBatch', () => {
  it('returns empty array for empty input', async () => {
    const results = await queryVulnerabilitiesBatch([]);
    expect(results).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('uses single endpoint for one package', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ vulns: [makeOsvVuln()] }),
    });

    const results = await queryVulnerabilitiesBatch([{ name: 'express', ecosystem: 'npm' }]);

    expect(results).toHaveLength(1);
    expect(results[0]!.vulnerabilities).toHaveLength(1);
    // Should use /v1/query not /v1/querybatch
    expect(mockFetch.mock.calls[0]![0]).toContain('/v1/query');
  });

  it('uses batch endpoint for multiple packages', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ vulns: [makeOsvVuln()] }, { vulns: [] }],
      }),
    });

    const results = await queryVulnerabilitiesBatch([
      { name: 'express', ecosystem: 'npm' },
      { name: 'lodash', ecosystem: 'npm' },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0]!.vulnerabilities).toHaveLength(1);
    expect(results[1]!.vulnerabilities).toHaveLength(0);
    expect(mockFetch.mock.calls[0]![0]).toContain('/v1/querybatch');
  });

  it('handles batch HTTP errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });

    const results = await queryVulnerabilitiesBatch([
      { name: 'express', ecosystem: 'npm' },
      { name: 'lodash', ecosystem: 'npm' },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0]!.vulnerabilities).toHaveLength(0);
    expect(results[0]!.error).toContain('503');
  });

  it('handles batch network errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Timeout'));

    const results = await queryVulnerabilitiesBatch([
      { name: 'a', ecosystem: 'npm' },
      { name: 'b', ecosystem: 'npm' },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0]!.error).toBe('Timeout');
    expect(results[1]!.error).toBe('Timeout');
  });

  it('passes version when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ vulns: [] }, { vulns: [] }],
      }),
    });

    await queryVulnerabilitiesBatch([
      { name: 'a', ecosystem: 'npm', version: '1.0.0' },
      { name: 'b', ecosystem: 'pypi' },
    ]);

    const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
    expect(body.queries[0].version).toBe('1.0.0');
    expect(body.queries[1].version).toBeUndefined();
  });
});
