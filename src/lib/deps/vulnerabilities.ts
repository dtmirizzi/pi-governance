/**
 * OSV.dev vulnerability database integration.
 *
 * Free, no auth, supports all major ecosystems.
 * https://osv.dev
 */

import type { Ecosystem } from './parser.js';

export interface VulnEntry {
  id: string;
  summary: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  fixedIn?: string;
  aliases: string[];
}

export interface VulnerabilityResult {
  package: string;
  ecosystem: Ecosystem;
  vulnerabilities: VulnEntry[];
  error?: string;
}

const REQUEST_TIMEOUT_MS = 5_000;

// Map ecosystem to OSV ecosystem identifier
function osvEcosystem(ecosystem: Ecosystem): string {
  switch (ecosystem) {
    case 'npm':
      return 'npm';
    case 'pypi':
      return 'PyPI';
    case 'crates.io':
      return 'crates.io';
    default:
      return ecosystem;
  }
}

interface OsvQueryRequest {
  package: { name: string; ecosystem: string };
  version?: string;
}

interface OsvVuln {
  id: string;
  summary?: string;
  details?: string;
  aliases?: string[];
  severity?: Array<{ type: string; score: string }>;
  affected?: Array<{
    ranges?: Array<{
      events?: Array<{ fixed?: string }>;
    }>;
  }>;
}

interface OsvQueryResponse {
  vulns?: OsvVuln[];
}

interface OsvBatchResponse {
  results: Array<{ vulns?: OsvVuln[] }>;
}

function parseSeverity(vuln: OsvVuln): 'low' | 'medium' | 'high' | 'critical' {
  const sevEntry = vuln.severity?.find((s) => s.type === 'CVSS_V3');
  if (!sevEntry) return 'medium'; // default if no CVSS

  // Parse CVSS v3 score from vector string: CVSS:3.1/AV:N/AC:L/...
  // or it could be a numeric score
  const scoreStr = sevEntry.score;
  const numericMatch = scoreStr.match(/(\d+\.\d+)/);
  if (numericMatch) {
    const score = parseFloat(numericMatch[1]!);
    if (score >= 9.0) return 'critical';
    if (score >= 7.0) return 'high';
    if (score >= 4.0) return 'medium';
    return 'low';
  }

  return 'medium';
}

function extractFixedVersion(vuln: OsvVuln): string | undefined {
  for (const affected of vuln.affected ?? []) {
    for (const range of affected.ranges ?? []) {
      for (const event of range.events ?? []) {
        if (event.fixed) return event.fixed;
      }
    }
  }
  return undefined;
}

function mapVuln(vuln: OsvVuln): VulnEntry {
  return {
    id: vuln.id,
    summary: vuln.summary ?? vuln.details?.slice(0, 200) ?? 'No description',
    severity: parseSeverity(vuln),
    fixedIn: extractFixedVersion(vuln),
    aliases: vuln.aliases ?? [],
  };
}

/**
 * Query OSV.dev for vulnerabilities affecting a single package.
 */
export async function queryVulnerabilities(
  name: string,
  ecosystem: Ecosystem,
  version?: string,
): Promise<VulnerabilityResult> {
  const body: OsvQueryRequest = {
    package: { name, ecosystem: osvEcosystem(ecosystem) },
  };
  if (version) body.version = version;

  try {
    const res = await fetch('https://api.osv.dev/v1/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) {
      return { package: name, ecosystem, vulnerabilities: [], error: `OSV HTTP ${res.status}` };
    }

    const data = (await res.json()) as OsvQueryResponse;
    return {
      package: name,
      ecosystem,
      vulnerabilities: (data.vulns ?? []).map(mapVuln),
    };
  } catch (err) {
    return {
      package: name,
      ecosystem,
      vulnerabilities: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Batch query OSV.dev for multiple packages at once.
 */
export async function queryVulnerabilitiesBatch(
  packages: Array<{ name: string; ecosystem: Ecosystem; version?: string }>,
): Promise<VulnerabilityResult[]> {
  if (packages.length === 0) return [];

  // Single package — use the simpler endpoint
  if (packages.length === 1) {
    const pkg = packages[0]!;
    return [await queryVulnerabilities(pkg.name, pkg.ecosystem, pkg.version)];
  }

  const queries = packages.map((pkg) => {
    const q: OsvQueryRequest = {
      package: { name: pkg.name, ecosystem: osvEcosystem(pkg.ecosystem) },
    };
    if (pkg.version) q.version = pkg.version;
    return q;
  });

  try {
    const res = await fetch('https://api.osv.dev/v1/querybatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queries }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) {
      return packages.map((pkg) => ({
        package: pkg.name,
        ecosystem: pkg.ecosystem,
        vulnerabilities: [],
        error: `OSV HTTP ${res.status}`,
      }));
    }

    const data = (await res.json()) as OsvBatchResponse;
    return data.results.map((result, i) => ({
      package: packages[i]!.name,
      ecosystem: packages[i]!.ecosystem,
      vulnerabilities: (result.vulns ?? []).map(mapVuln),
    }));
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    return packages.map((pkg) => ({
      package: pkg.name,
      ecosystem: pkg.ecosystem,
      vulnerabilities: [],
      error: errMsg,
    }));
  }
}
