import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchRegistryMetadata, clearRegistryCache } from '../../../src/lib/deps/registry.js';

// Mock global fetch
const mockFetch = vi.fn();

beforeEach(() => {
  clearRegistryCache();
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function npmPackument(overrides: Record<string, unknown> = {}) {
  return {
    name: 'express',
    description: 'Fast web framework',
    'dist-tags': { latest: '4.18.0' },
    time: { created: '2010-12-29T00:00:00.000Z', modified: '2024-01-01T00:00:00.000Z' },
    maintainers: [{ name: 'dougwilson' }, { name: 'tjholowaychuk' }],
    readme: 'A long readme with enough content to pass the check',
    license: 'MIT',
    repository: { type: 'git', url: 'https://github.com/expressjs/express' },
    versions: {
      '4.18.0': {
        scripts: { test: 'vitest' },
      },
    },
    ...overrides,
  };
}

function pypiResponse(overrides: Record<string, unknown> = {}) {
  return {
    info: {
      name: 'requests',
      version: '2.31.0',
      summary: 'HTTP library',
      license: 'Apache-2.0',
      home_page: 'https://github.com/psf/requests',
      project_urls: { Source: 'https://github.com/psf/requests' },
      author: 'Kenneth Reitz',
      maintainer: null,
      description: 'A long description with enough content',
      ...((overrides['info'] as Record<string, unknown>) ?? {}),
    },
    releases: {
      '2.31.0': [{ upload_time: '2023-05-22T00:00:00' }],
      '1.0.0': [{ upload_time: '2012-01-01T00:00:00' }],
      ...((overrides['releases'] as Record<string, unknown>) ?? {}),
    },
    urls: [{ upload_time: '2023-05-22T00:00:00' }],
    ...Object.fromEntries(
      Object.entries(overrides).filter(([k]) => !['info', 'releases'].includes(k)),
    ),
  };
}

describe('fetchRegistryMetadata', () => {
  describe('npm', () => {
    it('fetches npm package metadata successfully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => npmPackument(),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ downloads: 25_000_000 }),
        });

      const result = await fetchRegistryMetadata('express', 'npm');

      expect(result.exists).toBe(true);
      expect(result.name).toBe('express');
      expect(result.ecosystem).toBe('npm');
      expect(result.latestVersion).toBe('4.18.0');
      expect(result.weeklyDownloads).toBe(25_000_000);
      expect(result.maintainerCount).toBe(2);
      expect(result.hasRepository).toBe(true);
      expect(result.hasReadme).toBe(true);
      expect(result.hasInstallScripts).toBe(false);
      expect(result.license).toBe('MIT');
    });

    it('detects install scripts', async () => {
      const data = npmPackument({
        versions: {
          '4.18.0': {
            scripts: { postinstall: 'node setup.js', test: 'vitest' },
          },
        },
      });
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => data })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ downloads: 100 }) });

      const result = await fetchRegistryMetadata('evil-pkg', 'npm');
      expect(result.hasInstallScripts).toBe(true);
    });

    it('handles scoped packages', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => npmPackument({ name: '@scope/pkg' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ downloads: 100 }) });

      const result = await fetchRegistryMetadata('@scope/pkg', 'npm');
      expect(result.exists).toBe(true);
      expect(mockFetch.mock.calls[0]![0]).toContain('@');
    });

    it('returns notFound on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      const result = await fetchRegistryMetadata('nonexistent-pkg', 'npm');
      expect(result.exists).toBe(false);
    });

    it('returns notFound on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      const result = await fetchRegistryMetadata('some-pkg', 'npm');
      expect(result.exists).toBe(false);
    });

    it('handles failed download count fetch gracefully', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => npmPackument() })
        .mockRejectedValueOnce(new Error('Downloads API down'));

      const result = await fetchRegistryMetadata('express-dl-fail', 'npm');
      expect(result.exists).toBe(true);
      expect(result.weeklyDownloads).toBeUndefined();
    });

    it('handles missing dist-tags gracefully', async () => {
      const data = npmPackument({ 'dist-tags': undefined, versions: {} });
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => data })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ downloads: 50 }) });

      const result = await fetchRegistryMetadata('no-tags', 'npm');
      expect(result.exists).toBe(true);
      expect(result.latestVersion).toBeUndefined();
      expect(result.hasInstallScripts).toBe(false);
    });
  });

  describe('pypi', () => {
    it('fetches PyPI package metadata successfully', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => pypiResponse() })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { last_week: 5_000_000 } }),
        });

      const result = await fetchRegistryMetadata('requests', 'pypi');

      expect(result.exists).toBe(true);
      expect(result.name).toBe('requests');
      expect(result.ecosystem).toBe('pypi');
      expect(result.latestVersion).toBe('2.31.0');
      expect(result.weeklyDownloads).toBe(5_000_000);
      expect(result.hasRepository).toBe(true);
      expect(result.hasReadme).toBe(true);
      expect(result.hasInstallScripts).toBe(false);
      expect(result.license).toBe('Apache-2.0');
      expect(result.createdAt).toEqual(new Date('2012-01-01T00:00:00'));
    });

    it('returns notFound on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      const result = await fetchRegistryMetadata('nonexistent-pypi-pkg', 'pypi');
      expect(result.exists).toBe(false);
    });

    it('returns notFound on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      const result = await fetchRegistryMetadata('pypi-network-fail', 'pypi');
      expect(result.exists).toBe(false);
    });

    it('handles failed pypistats fetch gracefully', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => pypiResponse() })
        .mockRejectedValueOnce(new Error('Stats API down'));

      const result = await fetchRegistryMetadata('requests-stats-fail', 'pypi');
      expect(result.exists).toBe(true);
      expect(result.weeklyDownloads).toBeUndefined();
    });

    it('detects repository from project_urls', async () => {
      const data = pypiResponse({
        info: {
          name: 'flask',
          version: '3.0.0',
          summary: 'Web framework',
          license: 'BSD',
          home_page: null,
          project_urls: { Repository: 'https://github.com/pallets/flask' },
          author: 'Pallets',
          maintainer: null,
          description: 'A long description here for the readme check',
        },
      });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => data }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { last_week: 1_000_000 } }),
      });

      const result = await fetchRegistryMetadata('flask-repo', 'pypi');
      expect(result.hasRepository).toBe(true);
    });

    it('reports no repository when project_urls is empty', async () => {
      const data = pypiResponse({
        info: {
          name: 'orphan',
          version: '0.1.0',
          summary: 'No links',
          license: null,
          home_page: null,
          project_urls: null,
          author: null,
          maintainer: null,
          description: 'A description for the test',
        },
      });
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => data })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { last_week: 0 } }) });

      const result = await fetchRegistryMetadata('orphan-pypi', 'pypi');
      expect(result.hasRepository).toBe(false);
      expect(result.maintainerCount).toBe(0);
    });
  });

  describe('caching', () => {
    it('returns cached results on second call', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => npmPackument() })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ downloads: 100 }) });

      const result1 = await fetchRegistryMetadata('express-cache', 'npm');
      const result2 = await fetchRegistryMetadata('express-cache', 'npm');

      expect(result1).toBe(result2);
      // Only 2 fetch calls (packument + downloads), not 4
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('unsupported ecosystem', () => {
    it('returns notFound for unknown ecosystems', async () => {
      const result = await fetchRegistryMetadata('some-crate', 'crates.io');
      expect(result.exists).toBe(false);
      expect(result.ecosystem).toBe('crates.io');
    });
  });
});
