/**
 * Extracts package names from shell install commands.
 *
 * Supports npm, yarn, pnpm, pip, and cargo.
 */

export type Ecosystem = 'npm' | 'pypi' | 'crates.io';

export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'pip' | 'cargo';

export interface ParsedPackage {
  name: string;
  version?: string;
  ecosystem: Ecosystem;
}

export interface ParsedInstall {
  manager: PackageManager;
  packages: ParsedPackage[];
  flags: string[];
  raw: string;
  isLockfileInstall: boolean;
  usesCustomRegistry: boolean;
}

/** Flags that take a value argument (the next token should be skipped). */
const FLAGS_WITH_VALUE = new Set([
  // npm/yarn/pnpm
  '--registry',
  '--save-prefix',
  '--tag',
  '--cache',
  '--prefix',
  // pip
  '-r',
  '--requirement',
  '-c',
  '--constraint',
  '-e',
  '--editable',
  '-t',
  '--target',
  '--index-url',
  '-i',
  '--extra-index-url',
  '--find-links',
  '-f',
  '--root',
  '--prefix',
  // cargo
  '--git',
  '--branch',
  '--rev',
  '--path',
  '--version',
]);

const CUSTOM_REGISTRY_FLAGS = new Set(['--registry', '--index-url', '-i', '--extra-index-url']);

/** Patterns that indicate lockfile-only installs. */
const LOCKFILE_PATTERNS: RegExp[] = [
  /\bnpm\s+ci\b/,
  /\bpnpm\s+install\s+--frozen-lockfile\b/,
  /\byarn\s+install\s+--frozen-lockfile\b/,
  /\bpip\s+install\b.*--require-hashes\b/,
];

interface ManagerMatch {
  manager: PackageManager;
  ecosystem: Ecosystem;
  subcommandPattern: RegExp;
}

const MANAGER_MATCHERS: ManagerMatch[] = [
  { manager: 'npm', ecosystem: 'npm', subcommandPattern: /\bnpm\s+(install|i|add)\s/ },
  { manager: 'yarn', ecosystem: 'npm', subcommandPattern: /\byarn\s+(add|install)\s/ },
  { manager: 'pnpm', ecosystem: 'npm', subcommandPattern: /\bpnpm\s+(add|install|i)\s/ },
  { manager: 'pip', ecosystem: 'pypi', subcommandPattern: /\bpip\s+install\s/ },
  { manager: 'cargo', ecosystem: 'crates.io', subcommandPattern: /\bcargo\s+(add|install)\s/ },
];

function splitVersionFromName(
  raw: string,
  ecosystem: Ecosystem,
): { name: string; version?: string } {
  if (ecosystem === 'npm') {
    // @scope/pkg@version or pkg@version
    const atIdx = raw.lastIndexOf('@');
    if (atIdx > 0) {
      return { name: raw.slice(0, atIdx), version: raw.slice(atIdx + 1) };
    }
    return { name: raw };
  }
  if (ecosystem === 'pypi') {
    // pkg==version, pkg>=version, pkg~=version, pkg!=version
    const match = raw.match(/^([a-zA-Z0-9_.-]+)([=<>!~]+.+)?$/);
    if (match) {
      return { name: match[1]!, version: match[2] };
    }
    return { name: raw };
  }
  if (ecosystem === 'crates.io') {
    // pkg@version
    const atIdx = raw.indexOf('@');
    if (atIdx > 0) {
      return { name: raw.slice(0, atIdx), version: raw.slice(atIdx + 1) };
    }
    return { name: raw };
  }
  return { name: raw };
}

/**
 * Attempt to parse an install command and extract package names.
 * Returns undefined if the command is not a recognized install command.
 */
export function parseInstallCommand(command: string): ParsedInstall | undefined {
  const trimmed = command.trim();

  // Check lockfile patterns first
  const isLockfileInstall = LOCKFILE_PATTERNS.some((p) => p.test(trimmed));

  // npm ci is a lockfile install with no packages to parse
  if (/\bnpm\s+ci\b/.test(trimmed)) {
    return {
      manager: 'npm',
      packages: [],
      flags: [],
      raw: trimmed,
      isLockfileInstall: true,
      usesCustomRegistry: false,
    };
  }

  for (const matcher of MANAGER_MATCHERS) {
    if (!matcher.subcommandPattern.test(trimmed)) continue;

    // Extract everything after the subcommand
    const subMatch = trimmed.match(matcher.subcommandPattern);
    if (!subMatch) continue;

    const afterSubcommand = trimmed.slice(subMatch.index! + subMatch[0].length);
    const tokens = tokenize(afterSubcommand);

    const packages: ParsedPackage[] = [];
    const flags: string[] = [];
    let usesCustomRegistry = false;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]!;

      if (token.startsWith('-')) {
        flags.push(token);
        // Extract flag name (before '=' if present)
        const flagName = token.includes('=') ? token.slice(0, token.indexOf('=')) : token;
        if (CUSTOM_REGISTRY_FLAGS.has(flagName)) {
          usesCustomRegistry = true;
        }
        // If this flag takes a value, skip the next token
        if (FLAGS_WITH_VALUE.has(flagName) || token.includes('=')) {
          if (!token.includes('=')) i++;
        }
        continue;
      }

      // pip: skip file-based args
      if (matcher.manager === 'pip' && (token.endsWith('.txt') || token.endsWith('.cfg'))) {
        continue;
      }

      // pip: skip paths and URLs
      if (
        matcher.manager === 'pip' &&
        (token.startsWith('/') ||
          token.startsWith('./') ||
          token.startsWith('http://') ||
          token.startsWith('https://') ||
          token.startsWith('git+'))
      ) {
        continue;
      }

      const { name, version } = splitVersionFromName(token, matcher.ecosystem);
      if (name) {
        packages.push({ name, version, ecosystem: matcher.ecosystem });
      }
    }

    return {
      manager: matcher.manager,
      packages,
      flags,
      raw: trimmed,
      isLockfileInstall,
      usesCustomRegistry,
    };
  }

  return undefined;
}

/** Simple tokenizer that respects quotes. */
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;

    if (ch === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }
    if (ch === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (ch === ' ' && !inSingleQuote && !inDoubleQuote) {
      if (current) tokens.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}
