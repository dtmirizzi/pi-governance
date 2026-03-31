/**
 * Registry clients for npm and PyPI.
 *
 * Uses built-in fetch() (Node 22+). Zero dependencies.
 * All endpoints are free and require no authentication.
 */

import type { Ecosystem } from './parser.js';

export interface RegistryMetadata {
  name: string;
  ecosystem: Ecosystem;
  exists: boolean;
  createdAt?: Date;
  modifiedAt?: Date;
  latestVersion?: string;
  weeklyDownloads?: number;
  maintainerCount?: number;
  hasRepository: boolean;
  hasReadme: boolean;
  hasInstallScripts: boolean;
  description?: string;
  license?: string;
}

const REQUEST_TIMEOUT_MS = 5_000;

function withTimeout(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

// --- npm ---

interface NpmPackument {
  name: string;
  description?: string;
  'dist-tags'?: Record<string, string>;
  time?: Record<string, string>;
  maintainers?: Array<{ name: string; email?: string }>;
  readme?: string;
  license?: string;
  repository?: unknown;
  versions?: Record<string, NpmVersion>;
}

interface NpmVersion {
  scripts?: Record<string, string>;
}

interface NpmDownloadResponse {
  downloads: number;
}

async function fetchNpmMetadata(name: string): Promise<RegistryMetadata> {
  const encodedName = name.startsWith('@')
    ? `@${encodeURIComponent(name.slice(1))}`
    : encodeURIComponent(name);
  const url = `https://registry.npmjs.org/${encodedName}`;

  let res: Response;
  try {
    res = await fetch(url, { signal: withTimeout(REQUEST_TIMEOUT_MS) });
  } catch {
    return notFound(name, 'npm');
  }

  if (!res.ok) return notFound(name, 'npm');

  const data = (await res.json()) as NpmPackument;
  const latest = data['dist-tags']?.['latest'];
  const latestVersion = latest ? data.versions?.[latest] : undefined;
  const scripts = latestVersion?.scripts ?? {};
  const hasInstallScripts = !!(
    scripts['preinstall'] ||
    scripts['install'] ||
    scripts['postinstall']
  );

  // Downloads — separate request
  let weeklyDownloads: number | undefined;
  try {
    const dlUrl = `https://api.npmjs.org/downloads/point/last-week/${encodedName}`;
    const dlRes = await fetch(dlUrl, { signal: withTimeout(REQUEST_TIMEOUT_MS) });
    if (dlRes.ok) {
      const dlData = (await dlRes.json()) as NpmDownloadResponse;
      weeklyDownloads = dlData.downloads;
    }
  } catch {
    // Non-critical — leave undefined
  }

  return {
    name,
    ecosystem: 'npm',
    exists: true,
    createdAt: data.time?.['created'] ? new Date(data.time['created']) : undefined,
    modifiedAt: data.time?.['modified'] ? new Date(data.time['modified']) : undefined,
    latestVersion: latest,
    weeklyDownloads,
    maintainerCount: data.maintainers?.length,
    hasRepository: !!data.repository,
    hasReadme: !!(data.readme && data.readme.length > 10),
    hasInstallScripts,
    description: data.description,
    license: data.license,
  };
}

// --- PyPI ---

interface PyPIResponse {
  info: {
    name: string;
    version: string;
    summary?: string;
    license?: string;
    home_page?: string;
    project_urls?: Record<string, string>;
    author?: string;
    maintainer?: string;
    description?: string;
  };
  releases: Record<string, Array<{ upload_time: string }>>;
  urls: Array<{ upload_time: string }>;
}

interface PyPIStatsResponse {
  data: {
    last_week: number;
  };
}

async function fetchPyPIMetadata(name: string): Promise<RegistryMetadata> {
  const url = `https://pypi.org/pypi/${encodeURIComponent(name)}/json`;

  let res: Response;
  try {
    res = await fetch(url, { signal: withTimeout(REQUEST_TIMEOUT_MS) });
  } catch {
    return notFound(name, 'pypi');
  }

  if (!res.ok) return notFound(name, 'pypi');

  const data = (await res.json()) as PyPIResponse;

  // Find the earliest upload time across all releases
  let earliest: Date | undefined;
  for (const files of Object.values(data.releases)) {
    for (const file of files) {
      const d = new Date(file.upload_time);
      if (!earliest || d < earliest) earliest = d;
    }
  }

  // Determine if there's a project URL / repository
  const projectUrls = data.info.project_urls ?? {};
  const hasRepo = !!(
    data.info.home_page ||
    projectUrls['Source'] ||
    projectUrls['Repository'] ||
    projectUrls['GitHub'] ||
    projectUrls['Homepage']
  );

  // Maintainer count — PyPI doesn't expose this directly, so we approximate
  const hasMaintainer = !!(data.info.maintainer || data.info.author);

  // Downloads — pypistats.org
  let weeklyDownloads: number | undefined;
  try {
    const statsUrl = `https://pypistats.org/api/packages/${encodeURIComponent(name)}/recent`;
    const statsRes = await fetch(statsUrl, {
      signal: withTimeout(REQUEST_TIMEOUT_MS),
      headers: { Accept: 'application/json' },
    });
    if (statsRes.ok) {
      const statsData = (await statsRes.json()) as PyPIStatsResponse;
      weeklyDownloads = statsData.data?.last_week;
    }
  } catch {
    // Non-critical
  }

  return {
    name,
    ecosystem: 'pypi',
    exists: true,
    createdAt: earliest,
    modifiedAt:
      data.urls.length > 0 ? new Date(data.urls[data.urls.length - 1]!.upload_time) : undefined,
    latestVersion: data.info.version,
    weeklyDownloads,
    maintainerCount: hasMaintainer ? 1 : 0,
    hasRepository: hasRepo,
    hasReadme: !!(data.info.description && data.info.description.length > 10),
    hasInstallScripts: false, // PyPI doesn't have post-install scripts in the same way
    description: data.info.summary,
    license: data.info.license,
  };
}

// --- Helpers ---

function notFound(name: string, ecosystem: Ecosystem): RegistryMetadata {
  return {
    name,
    ecosystem,
    exists: false,
    hasRepository: false,
    hasReadme: false,
    hasInstallScripts: false,
  };
}

// --- Cache ---

const cache = new Map<string, RegistryMetadata>();
const MAX_CACHE_SIZE = 200;

function cacheKey(name: string, ecosystem: Ecosystem): string {
  return `${ecosystem}:${name}`;
}

// --- Public API ---

export async function fetchRegistryMetadata(
  name: string,
  ecosystem: Ecosystem,
): Promise<RegistryMetadata> {
  const key = cacheKey(name, ecosystem);
  const cached = cache.get(key);
  if (cached) return cached;

  let result: RegistryMetadata;
  switch (ecosystem) {
    case 'npm':
      result = await fetchNpmMetadata(name);
      break;
    case 'pypi':
      result = await fetchPyPIMetadata(name);
      break;
    default:
      result = notFound(name, ecosystem);
  }

  // LRU eviction
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(key, result);

  return result;
}

/** Clear the cache (useful for testing). */
export function clearRegistryCache(): void {
  cache.clear();
}
