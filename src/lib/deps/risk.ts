/**
 * Risk scoring engine for dependency validation.
 *
 * Computes a risk report for a single package based on registry metadata,
 * vulnerability data, and typosquat analysis.
 */

import type { RegistryMetadata } from './registry.js';
import type { VulnEntry } from './vulnerabilities.js';
import type { TyposquatMatch } from './levenshtein.js';

export type RiskSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type RiskRecommendation = 'allow' | 'escalate' | 'block';

export interface RiskSignal {
  name: string;
  severity: RiskSeverity;
  detail: string;
}

export interface RiskReport {
  package: string;
  ecosystem: string;
  overallRisk: RiskSeverity;
  signals: RiskSignal[];
  vulnerabilities: VulnEntry[];
  recommendation: RiskRecommendation;
  metadata: RegistryMetadata;
}

export interface RiskThresholds {
  minAgeDays: number;
  minWeeklyDownloads: number;
}

const DEFAULT_THRESHOLDS: RiskThresholds = {
  minAgeDays: 30,
  minWeeklyDownloads: 100,
};

const SEVERITY_ORDER: Record<RiskSeverity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

function maxSeverity(a: RiskSeverity, b: RiskSeverity): RiskSeverity {
  return SEVERITY_ORDER[a] >= SEVERITY_ORDER[b] ? a : b;
}

export function computeRiskReport(
  metadata: RegistryMetadata,
  vulns: VulnEntry[],
  typosquatMatch: TyposquatMatch | undefined,
  isBlocklisted: boolean,
  isAllowlisted: boolean,
  thresholds: RiskThresholds = DEFAULT_THRESHOLDS,
): RiskReport {
  const signals: RiskSignal[] = [];
  let overallRisk: RiskSeverity = 'info';

  // --- Critical signals ---

  if (!metadata.exists) {
    signals.push({
      name: 'package_not_found',
      severity: 'critical',
      detail: `Package "${metadata.name}" does not exist on ${metadata.ecosystem}`,
    });
    overallRisk = 'critical';
  }

  if (isBlocklisted) {
    signals.push({
      name: 'on_blocklist',
      severity: 'critical',
      detail: `Package "${metadata.name}" is on the blocklist`,
    });
    overallRisk = 'critical';
  }

  // Vulnerabilities
  for (const vuln of vulns) {
    signals.push({
      name: 'known_vulnerability',
      severity: vuln.severity,
      detail: `${vuln.id}: ${vuln.summary}${vuln.fixedIn ? ` (fixed in ${vuln.fixedIn})` : ''}`,
    });
    overallRisk = maxSeverity(overallRisk, vuln.severity);
  }

  // If allowlisted, skip reputation checks but still report vulns/blocklist
  if (isAllowlisted && signals.length === 0) {
    return {
      package: metadata.name,
      ecosystem: metadata.ecosystem,
      overallRisk: 'info',
      signals: [],
      vulnerabilities: vulns,
      recommendation: 'allow',
      metadata,
    };
  }

  // --- Reputation signals (skipped for allowlisted packages) ---
  if (!isAllowlisted && metadata.exists) {
    // Package age
    if (metadata.createdAt) {
      const ageDays = (Date.now() - metadata.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays < 7) {
        signals.push({
          name: 'very_new_package',
          severity: 'high',
          detail: `Created ${Math.floor(ageDays)} days ago`,
        });
        overallRisk = maxSeverity(overallRisk, 'high');
      } else if (ageDays < thresholds.minAgeDays) {
        signals.push({
          name: 'new_package',
          severity: 'medium',
          detail: `Created ${Math.floor(ageDays)} days ago (threshold: ${thresholds.minAgeDays})`,
        });
        overallRisk = maxSeverity(overallRisk, 'medium');
      }
    }

    // Download count
    if (metadata.weeklyDownloads !== undefined) {
      if (metadata.weeklyDownloads < thresholds.minWeeklyDownloads) {
        const sev = metadata.weeklyDownloads < 10 ? 'high' : 'medium';
        signals.push({
          name: 'low_downloads',
          severity: sev,
          detail: `${metadata.weeklyDownloads} weekly downloads (threshold: ${thresholds.minWeeklyDownloads})`,
        });
        overallRisk = maxSeverity(overallRisk, sev);
      }
    }

    // Typosquatting
    if (typosquatMatch) {
      signals.push({
        name: 'typosquat_suspect',
        severity: 'high',
        detail: `Similar to "${typosquatMatch.target}" (edit distance: ${typosquatMatch.distance})`,
      });
      overallRisk = maxSeverity(overallRisk, 'high');
    }

    // Install scripts
    if (metadata.hasInstallScripts) {
      signals.push({
        name: 'has_install_scripts',
        severity: 'medium',
        detail: 'Package has preinstall/install/postinstall scripts',
      });
      overallRisk = maxSeverity(overallRisk, 'medium');
    }

    // No repository
    if (!metadata.hasRepository) {
      signals.push({
        name: 'no_repository',
        severity: 'low',
        detail: 'No source repository URL in metadata',
      });
      overallRisk = maxSeverity(overallRisk, 'low');
    }

    // No README
    if (!metadata.hasReadme) {
      signals.push({
        name: 'no_readme',
        severity: 'low',
        detail: 'No README content',
      });
      overallRisk = maxSeverity(overallRisk, 'low');
    }

    // No license
    if (!metadata.license) {
      signals.push({
        name: 'no_license',
        severity: 'low',
        detail: 'No license declared',
      });
      overallRisk = maxSeverity(overallRisk, 'low');
    }

    // Single maintainer
    if (metadata.maintainerCount !== undefined && metadata.maintainerCount <= 1) {
      signals.push({
        name: 'single_maintainer',
        severity: 'info',
        detail: `${metadata.maintainerCount} maintainer(s)`,
      });
    }
  }

  // --- Compute recommendation ---
  let recommendation: RiskRecommendation;
  if (SEVERITY_ORDER[overallRisk] >= SEVERITY_ORDER['critical']) {
    recommendation = 'block';
  } else if (SEVERITY_ORDER[overallRisk] >= SEVERITY_ORDER['medium']) {
    recommendation = 'escalate';
  } else {
    recommendation = 'allow';
  }

  return {
    package: metadata.name,
    ecosystem: metadata.ecosystem,
    overallRisk,
    signals,
    vulnerabilities: vulns,
    recommendation,
    metadata,
  };
}
