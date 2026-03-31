import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { evaluateInstall, type DependencyGuardianConfig } from '../../../src/lib/deps/guardian.js';

// Mock all sub-modules
vi.mock('../../../src/lib/deps/registry.js', () => ({
  fetchRegistryMetadata: vi.fn(),
}));
vi.mock('../../../src/lib/deps/vulnerabilities.js', () => ({
  queryVulnerabilitiesBatch: vi.fn(),
}));

import { fetchRegistryMetadata } from '../../../src/lib/deps/registry.js';
import { queryVulnerabilitiesBatch } from '../../../src/lib/deps/vulnerabilities.js';

const mockFetchRegistry = vi.mocked(fetchRegistryMetadata);
const mockQueryVulns = vi.mocked(queryVulnerabilitiesBatch);

function makeConfig(overrides: Partial<DependencyGuardianConfig> = {}): DependencyGuardianConfig {
  return {
    enabled: true,
    checks: {
      existence: true,
      reputation: true,
      typosquatting: true,
      install_scripts: true,
      vulnerabilities: true,
    },
    risk_thresholds: { min_age_days: 30, min_weekly_downloads: 100 },
    on_risk: 'escalate',
    allowlist: [],
    blocklist: [],
    blocklist_patterns: [],
    custom_registry_bypass: true,
    ...overrides,
  };
}

function goodMetadata(name: string) {
  return {
    name,
    ecosystem: 'npm' as const,
    exists: true,
    createdAt: new Date('2020-01-01'),
    weeklyDownloads: 500_000,
    maintainerCount: 5,
    hasRepository: true,
    hasReadme: true,
    hasInstallScripts: false,
    license: 'MIT',
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('evaluateInstall', () => {
  describe('skip cases', () => {
    it('skips when disabled', async () => {
      const result = await evaluateInstall('npm install foo', makeConfig({ enabled: false }));
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toContain('disabled');
    });

    it('skips for non-install commands', async () => {
      const result = await evaluateInstall('npm test', makeConfig());
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toContain('Not a recognized');
    });

    it('skips lockfile installs', async () => {
      const result = await evaluateInstall('npm ci', makeConfig());
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toContain('Lock-file');
    });

    it('skips custom registry when bypass enabled', async () => {
      const result = await evaluateInstall(
        'npm install foo --registry https://private.example.com',
        makeConfig(),
      );
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toContain('Custom registry');
    });

    it('does NOT skip custom registry when bypass disabled', async () => {
      mockFetchRegistry.mockResolvedValue(goodMetadata('foo'));
      mockQueryVulns.mockResolvedValue([{ package: 'foo', ecosystem: 'npm', vulnerabilities: [] }]);

      const result = await evaluateInstall(
        'npm install foo --registry https://private.example.com',
        makeConfig({ custom_registry_bypass: false }),
      );
      expect(result.skipped).toBe(false);
    });

    it('skips bare npm install (no packages)', async () => {
      // `npm install` with no package names isn't parsed as an install command
      const result = await evaluateInstall('npm install', makeConfig());
      expect(result.skipped).toBe(true);
    });
  });

  describe('evaluation', () => {
    it('allows well-known safe packages', async () => {
      mockFetchRegistry.mockResolvedValue(goodMetadata('express'));
      mockQueryVulns.mockResolvedValue([
        { package: 'express', ecosystem: 'npm', vulnerabilities: [] },
      ]);

      const result = await evaluateInstall('npm install express', makeConfig());

      expect(result.skipped).toBe(false);
      expect(result.overallRecommendation).toBe('allow');
      expect(result.packages).toHaveLength(1);
      expect(result.auditMetadata).toHaveProperty('manager', 'npm');
    });

    it('blocks non-existent packages', async () => {
      mockFetchRegistry.mockResolvedValue({
        name: 'expresss',
        ecosystem: 'npm',
        exists: false,
        hasRepository: false,
        hasReadme: false,
        hasInstallScripts: false,
      });
      mockQueryVulns.mockResolvedValue([
        { package: 'expresss', ecosystem: 'npm', vulnerabilities: [] },
      ]);

      const result = await evaluateInstall('npm install expresss', makeConfig());

      expect(result.overallRecommendation).toBe('block');
      expect(result.summary).toContain('BLOCK');
    });

    it('escalates for vulnerable packages', async () => {
      mockFetchRegistry.mockResolvedValue(goodMetadata('lodash'));
      mockQueryVulns.mockResolvedValue([
        {
          package: 'lodash',
          ecosystem: 'npm',
          vulnerabilities: [
            { id: 'CVE-2024-1234', summary: 'Prototype pollution', severity: 'high', aliases: [] },
          ],
        },
      ]);

      const result = await evaluateInstall('npm install lodash', makeConfig());

      expect(result.overallRecommendation).toBe('escalate');
      expect(result.summary).toContain('Requires human approval');
    });

    it('handles multiple packages (most restrictive wins)', async () => {
      mockFetchRegistry.mockResolvedValueOnce(goodMetadata('safe-pkg')).mockResolvedValueOnce({
        name: 'bad-pkg',
        ecosystem: 'npm',
        exists: false,
        hasRepository: false,
        hasReadme: false,
        hasInstallScripts: false,
      });
      mockQueryVulns.mockResolvedValue([
        { package: 'safe-pkg', ecosystem: 'npm', vulnerabilities: [] },
        { package: 'bad-pkg', ecosystem: 'npm', vulnerabilities: [] },
      ]);

      const result = await evaluateInstall('npm install safe-pkg bad-pkg', makeConfig());

      expect(result.packages).toHaveLength(2);
      expect(result.overallRecommendation).toBe('block');
    });

    it('skips registry fetch when existence/reputation/install_scripts checks disabled', async () => {
      mockQueryVulns.mockResolvedValue([{ package: 'foo', ecosystem: 'npm', vulnerabilities: [] }]);

      const config = makeConfig({
        checks: {
          existence: false,
          reputation: false,
          typosquatting: true,
          install_scripts: false,
          vulnerabilities: true,
        },
      });

      const result = await evaluateInstall('npm install foo', config);

      expect(result.skipped).toBe(false);
      expect(mockFetchRegistry).not.toHaveBeenCalled();
    });

    it('skips vulnerability fetch when vulnerabilities check disabled', async () => {
      mockFetchRegistry.mockResolvedValue(goodMetadata('foo'));

      const config = makeConfig({
        checks: {
          existence: true,
          reputation: true,
          typosquatting: true,
          install_scripts: true,
          vulnerabilities: false,
        },
      });

      const result = await evaluateInstall('npm install foo', config);

      expect(result.skipped).toBe(false);
      expect(mockQueryVulns).not.toHaveBeenCalled();
    });
  });

  describe('on_risk modes', () => {
    it('audit mode downgrades escalate to allow', async () => {
      mockFetchRegistry.mockResolvedValue({
        ...goodMetadata('new-pkg'),
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days old
        weeklyDownloads: 5,
      });
      mockQueryVulns.mockResolvedValue([
        { package: 'new-pkg', ecosystem: 'npm', vulnerabilities: [] },
      ]);

      const result = await evaluateInstall('npm install new-pkg', makeConfig({ on_risk: 'audit' }));

      expect(result.overallRecommendation).toBe('allow');
    });

    it('block mode upgrades escalate to block', async () => {
      mockFetchRegistry.mockResolvedValue({
        ...goodMetadata('new-pkg'),
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        weeklyDownloads: 5,
      });
      mockQueryVulns.mockResolvedValue([
        { package: 'new-pkg', ecosystem: 'npm', vulnerabilities: [] },
      ]);

      const result = await evaluateInstall('npm install new-pkg', makeConfig({ on_risk: 'block' }));

      expect(result.overallRecommendation).toBe('block');
    });
  });

  describe('formatSummary', () => {
    it('includes package name and risk in summary', async () => {
      mockFetchRegistry.mockResolvedValue({
        ...goodMetadata('risky'),
        weeklyDownloads: 2,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      });
      mockQueryVulns.mockResolvedValue([
        { package: 'risky', ecosystem: 'npm', vulnerabilities: [] },
      ]);

      const result = await evaluateInstall('npm install risky', makeConfig());

      expect(result.summary).toContain('Command: npm install risky');
      expect(result.summary).toContain('Package: risky');
      expect(result.summary).toContain('Risk:');
      expect(result.summary).toContain('Signals:');
    });

    it('omits clean packages from summary', async () => {
      mockFetchRegistry.mockResolvedValue(goodMetadata('clean'));
      mockQueryVulns.mockResolvedValue([
        { package: 'clean', ecosystem: 'npm', vulnerabilities: [] },
      ]);

      const result = await evaluateInstall('npm install clean', makeConfig());

      // Clean packages with no signals are omitted from the detail section
      expect(result.summary).toContain('Command:');
      expect(result.summary).not.toContain('Signals:');
    });
  });

  describe('pip support', () => {
    it('evaluates pip install commands', async () => {
      mockFetchRegistry.mockResolvedValue({
        ...goodMetadata('requests'),
        ecosystem: 'pypi',
      });
      mockQueryVulns.mockResolvedValue([
        { package: 'requests', ecosystem: 'pypi', vulnerabilities: [] },
      ]);

      const result = await evaluateInstall('pip install requests', makeConfig());

      expect(result.skipped).toBe(false);
      expect(result.packages).toHaveLength(1);
    });
  });
});
