import { describe, it, expect } from 'vitest';
import { computeRiskReport } from '../../../src/lib/deps/risk.js';
import type { RegistryMetadata } from '../../../src/lib/deps/registry.js';
import type { VulnEntry } from '../../../src/lib/deps/vulnerabilities.js';

function makeMetadata(overrides: Partial<RegistryMetadata> = {}): RegistryMetadata {
  return {
    name: 'test-pkg',
    ecosystem: 'npm',
    exists: true,
    createdAt: new Date('2020-01-01'),
    weeklyDownloads: 50_000,
    maintainerCount: 5,
    hasRepository: true,
    hasReadme: true,
    hasInstallScripts: false,
    description: 'A test package',
    license: 'MIT',
    ...overrides,
  };
}

describe('computeRiskReport', () => {
  it('allows well-known packages with no signals', () => {
    const report = computeRiskReport(makeMetadata(), [], undefined, false, true);
    expect(report.recommendation).toBe('allow');
    expect(report.signals).toHaveLength(0);
  });

  it('blocks packages not found on registry', () => {
    const metadata = makeMetadata({ exists: false });
    const report = computeRiskReport(metadata, [], undefined, false, false);
    expect(report.recommendation).toBe('block');
    expect(report.signals.some((s) => s.name === 'package_not_found')).toBe(true);
  });

  it('blocks blocklisted packages', () => {
    const report = computeRiskReport(makeMetadata(), [], undefined, true, false);
    expect(report.recommendation).toBe('block');
    expect(report.signals.some((s) => s.name === 'on_blocklist')).toBe(true);
  });

  it('escalates for very new packages', () => {
    const metadata = makeMetadata({ createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }); // 3 days
    const report = computeRiskReport(metadata, [], undefined, false, false);
    expect(report.overallRisk).toBe('high');
    expect(report.recommendation).toBe('escalate');
    expect(report.signals.some((s) => s.name === 'very_new_package')).toBe(true);
  });

  it('escalates for low downloads', () => {
    const metadata = makeMetadata({ weeklyDownloads: 5 });
    const report = computeRiskReport(metadata, [], undefined, false, false);
    expect(report.recommendation).toBe('escalate');
    expect(report.signals.some((s) => s.name === 'low_downloads')).toBe(true);
  });

  it('escalates for typosquat suspects', () => {
    const report = computeRiskReport(
      makeMetadata(),
      [],
      { target: 'express', distance: 1, similarity: 0.93 },
      false,
      false,
    );
    expect(report.recommendation).toBe('escalate');
    expect(report.signals.some((s) => s.name === 'typosquat_suspect')).toBe(true);
  });

  it('reports vulnerabilities with correct severity', () => {
    const vulns: VulnEntry[] = [
      {
        id: 'CVE-2024-1234',
        summary: 'XSS vulnerability',
        severity: 'high',
        aliases: [],
      },
    ];
    const report = computeRiskReport(makeMetadata(), vulns, undefined, false, true);
    // Allowlisted packages still get vuln signals
    expect(report.vulnerabilities).toHaveLength(1);
    expect(report.recommendation).toBe('escalate');
  });

  it('reports install scripts as medium risk', () => {
    const metadata = makeMetadata({ hasInstallScripts: true });
    const report = computeRiskReport(metadata, [], undefined, false, false);
    expect(report.signals.some((s) => s.name === 'has_install_scripts')).toBe(true);
  });

  it('reports missing repo and license as low risk', () => {
    const metadata = makeMetadata({ hasRepository: false, license: undefined });
    const report = computeRiskReport(metadata, [], undefined, false, false);
    expect(report.signals.some((s) => s.name === 'no_repository')).toBe(true);
    expect(report.signals.some((s) => s.name === 'no_license')).toBe(true);
    expect(report.recommendation).toBe('allow');
  });

  it('skips reputation checks for allowlisted packages', () => {
    const metadata = makeMetadata({ weeklyDownloads: 1, createdAt: new Date() });
    // Allowlisted + no vulns/blocklist = allow with no signals
    const report = computeRiskReport(metadata, [], undefined, false, true);
    expect(report.recommendation).toBe('allow');
    expect(report.signals).toHaveLength(0);
  });

  it('respects custom thresholds', () => {
    const metadata = makeMetadata({
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days
      weeklyDownloads: 500,
    });
    // With default thresholds (30 days, 100 downloads), this would flag
    const report1 = computeRiskReport(metadata, [], undefined, false, false);
    expect(report1.signals.some((s) => s.name === 'new_package')).toBe(true);

    // With relaxed thresholds, it should not flag
    const report2 = computeRiskReport(metadata, [], undefined, false, false, {
      minAgeDays: 7,
      minWeeklyDownloads: 50,
    });
    expect(report2.signals.some((s) => s.name === 'new_package')).toBe(false);
  });
});
