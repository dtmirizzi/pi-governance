/**
 * Dependency Guardian — orchestrator module.
 *
 * Parses install commands, runs all checks, and returns a risk report.
 */

import { parseInstallCommand } from './parser.js';
import { fetchRegistryMetadata } from './registry.js';
import { queryVulnerabilitiesBatch } from './vulnerabilities.js';
import { detectTyposquat } from './levenshtein.js';
import { buildAllowBlockLists, isAllowlisted, isBlocklisted } from './allowlist.js';
import { computeRiskReport, type RiskReport, type RiskRecommendation } from './risk.js';

export interface DependencyGuardianConfig {
  enabled: boolean;
  checks: {
    existence: boolean;
    reputation: boolean;
    typosquatting: boolean;
    install_scripts: boolean;
    vulnerabilities: boolean;
  };
  risk_thresholds: {
    min_age_days: number;
    min_weekly_downloads: number;
  };
  on_risk: 'escalate' | 'block' | 'audit';
  allowlist: string[];
  blocklist: string[];
  blocklist_patterns: string[];
  custom_registry_bypass: boolean;
}

export interface GuardianResult {
  command: string;
  packages: RiskReport[];
  overallRecommendation: RiskRecommendation;
  summary: string;
  auditMetadata: Record<string, unknown>;
  skipped: boolean;
  skipReason?: string;
}

const DEFAULT_CONFIG: DependencyGuardianConfig = {
  enabled: true,
  checks: {
    existence: true,
    reputation: true,
    typosquatting: true,
    install_scripts: true,
    vulnerabilities: true,
  },
  risk_thresholds: {
    min_age_days: 30,
    min_weekly_downloads: 100,
  },
  on_risk: 'escalate',
  allowlist: [],
  blocklist: [],
  blocklist_patterns: [],
  custom_registry_bypass: true,
};

/**
 * Evaluate an install command and return a risk report for all packages.
 */
export async function evaluateInstall(
  command: string,
  config: DependencyGuardianConfig = DEFAULT_CONFIG,
): Promise<GuardianResult> {
  if (!config.enabled) {
    return skippedResult(command, 'Dependency guardian is disabled');
  }

  const parsed = parseInstallCommand(command);
  if (!parsed) {
    return skippedResult(command, 'Not a recognized install command');
  }

  // Lock-file installs are low risk — skip
  if (parsed.isLockfileInstall) {
    return skippedResult(command, 'Lock-file install (pinned dependencies)');
  }

  // Custom registry bypass
  if (config.custom_registry_bypass && parsed.usesCustomRegistry) {
    return skippedResult(command, 'Custom registry detected (bypass enabled)');
  }

  // No packages extracted (e.g., `npm install` with no args reinstalls from package.json)
  if (parsed.packages.length === 0) {
    return skippedResult(command, 'No specific packages to validate');
  }

  // Build merged allow/block lists per ecosystem
  const ecosystems = [...new Set(parsed.packages.map((p) => p.ecosystem))];
  const listsPerEcosystem = new Map(
    ecosystems.map((eco) => [
      eco,
      buildAllowBlockLists(eco, config.allowlist, config.blocklist, config.blocklist_patterns),
    ]),
  );

  // Fetch registry metadata in parallel
  const metadataPromises = parsed.packages.map(async (pkg) => {
    if (!config.checks.existence && !config.checks.reputation && !config.checks.install_scripts) {
      return undefined;
    }
    return fetchRegistryMetadata(pkg.name, pkg.ecosystem);
  });

  // Fetch vulnerabilities in batch
  const vulnPromise = config.checks.vulnerabilities
    ? queryVulnerabilitiesBatch(
        parsed.packages.map((p) => ({
          name: p.name,
          ecosystem: p.ecosystem,
          version: p.version,
        })),
      )
    : Promise.resolve(
        parsed.packages.map((p) => ({
          package: p.name,
          ecosystem: p.ecosystem,
          vulnerabilities: [] as import('./vulnerabilities.js').VulnEntry[],
        })),
      );

  const [metadataResults, vulnResults] = await Promise.all([
    Promise.all(metadataPromises),
    vulnPromise,
  ]);

  // Compute risk reports
  const reports: RiskReport[] = [];
  for (let i = 0; i < parsed.packages.length; i++) {
    const pkg = parsed.packages[i]!;
    const lists = listsPerEcosystem.get(pkg.ecosystem)!;
    const allowed = isAllowlisted(pkg.name, lists.allowlist);
    const blocked = isBlocklisted(pkg.name, lists.blocklist, lists.blocklistPatterns);

    const metadata = metadataResults[i] ?? {
      name: pkg.name,
      ecosystem: pkg.ecosystem,
      exists: true, // assume exists if we didn't check
      hasRepository: true,
      hasReadme: true,
      hasInstallScripts: false,
    };

    const vulns = vulnResults[i]?.vulnerabilities ?? [];

    const typosquatMatch =
      config.checks.typosquatting && !allowed
        ? detectTyposquat(pkg.name, lists.allowlist)
        : undefined;

    const report = computeRiskReport(metadata, vulns, typosquatMatch, blocked, allowed, {
      minAgeDays: config.risk_thresholds.min_age_days,
      minWeeklyDownloads: config.risk_thresholds.min_weekly_downloads,
    });

    reports.push(report);
  }

  // Compute overall recommendation (most restrictive)
  let overallRecommendation: RiskRecommendation = 'allow';
  for (const report of reports) {
    if (report.recommendation === 'block') {
      overallRecommendation = 'block';
      break;
    }
    if (report.recommendation === 'escalate') {
      overallRecommendation = 'escalate';
    }
  }

  // If on_risk is 'audit', downgrade escalate→allow (still log)
  if (config.on_risk === 'audit' && overallRecommendation === 'escalate') {
    overallRecommendation = 'allow';
  }
  // If on_risk is 'block', upgrade escalate→block
  if (config.on_risk === 'block' && overallRecommendation === 'escalate') {
    overallRecommendation = 'block';
  }

  const summary = formatSummary(command, reports, overallRecommendation);

  return {
    command,
    packages: reports,
    overallRecommendation,
    summary,
    auditMetadata: {
      command,
      manager: parsed.manager,
      packages: reports.map((r) => ({
        name: r.package,
        ecosystem: r.ecosystem,
        risk: r.overallRisk,
        signals: r.signals.map((s) => s.name),
        vulnCount: r.vulnerabilities.length,
      })),
    },
    skipped: false,
  };
}

function skippedResult(command: string, reason: string): GuardianResult {
  return {
    command,
    packages: [],
    overallRecommendation: 'allow',
    summary: reason,
    auditMetadata: { command, skipped: true, reason },
    skipped: true,
    skipReason: reason,
  };
}

function formatSummary(
  command: string,
  reports: RiskReport[],
  recommendation: RiskRecommendation,
): string {
  const lines: string[] = [];
  lines.push(`Command: ${command}`);
  lines.push('');

  for (const report of reports) {
    if (report.signals.length === 0 && report.vulnerabilities.length === 0) continue;

    lines.push(`Package: ${report.package} (${report.ecosystem})`);
    lines.push(`Risk: ${report.overallRisk.toUpperCase()}`);

    if (report.signals.length > 0) {
      lines.push('Signals:');
      for (const signal of report.signals) {
        const icon =
          signal.severity === 'critical' || signal.severity === 'high'
            ? '!!'
            : signal.severity === 'medium'
              ? '! '
              : '  ';
        lines.push(`  ${icon} ${signal.name}: ${signal.detail}`);
      }
    }

    lines.push('');
  }

  if (recommendation === 'block') {
    lines.push('Recommendation: BLOCK');
  } else if (recommendation === 'escalate') {
    lines.push('Recommendation: Requires human approval');
  }

  return lines.join('\n');
}
