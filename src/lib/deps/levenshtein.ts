/**
 * Levenshtein distance and typosquat detection.
 *
 * Single-row Wagner-Fischer: O(n*m) time, O(min(n,m)) space.
 * Zero dependencies.
 */

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Ensure a is the shorter string for space efficiency
  if (a.length > b.length) [a, b] = [b, a];

  const m = a.length;
  const n = b.length;
  const row = new Array<number>(m + 1);
  for (let j = 0; j <= m; j++) row[j] = j;

  for (let i = 1; i <= n; i++) {
    let corner = row[0]!;
    row[0] = i;
    for (let j = 1; j <= m; j++) {
      const temp = row[j]!;
      if (b[i - 1] === a[j - 1]) {
        row[j] = corner;
      } else {
        row[j] = 1 + Math.min(corner, temp, row[j - 1]!);
      }
      corner = temp;
    }
  }
  return row[m]!;
}

export function normalizedSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

/**
 * Normalize a package name for comparison:
 * - Strip npm scope prefix (@scope/)
 * - Remove hyphens, underscores, dots
 * - Lowercase
 */
export function normalizeName(name: string): string {
  // Strip scope
  const stripped = name.replace(/^@[^/]+\//, '');
  // Remove separators and lowercase
  return stripped.replace(/[-_.]/g, '').toLowerCase();
}

export interface TyposquatMatch {
  target: string;
  distance: number;
  similarity: number;
}

/**
 * Check a package name against a corpus of known-good names.
 * Returns the closest match if it looks like a typosquat.
 */
export function detectTyposquat(name: string, corpus: string[]): TyposquatMatch | undefined {
  const normalized = normalizeName(name);

  let bestMatch: TyposquatMatch | undefined;
  let bestDistance = Infinity;

  for (const target of corpus) {
    const normalizedTarget = normalizeName(target);

    // Skip exact matches (the package is the popular package itself)
    if (normalizedTarget === normalized) return undefined;

    const distance = levenshteinDistance(normalized, normalizedTarget);
    const similarity = normalizedSimilarity(normalized, normalizedTarget);

    // Flag thresholds:
    // - edit distance 1: always flag
    // - edit distance 2 + name length >= 5: flag
    // - normalized similarity >= 0.85: flag
    const shouldFlag =
      distance === 1 || (distance === 2 && normalized.length >= 5) || similarity >= 0.85;

    if (shouldFlag && distance < bestDistance) {
      bestDistance = distance;
      bestMatch = { target, distance, similarity };
    }
  }

  return bestMatch;
}
