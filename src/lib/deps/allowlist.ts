/**
 * Default allowlists and blocklists for dependency validation.
 *
 * The allowlist doubles as the "popular packages" corpus for typosquat detection.
 * Users extend these via config; user entries take precedence.
 */

export const DEFAULT_NPM_ALLOWLIST: string[] = [
  // Frameworks
  'express',
  'react',
  'react-dom',
  'next',
  'vue',
  'angular',
  'svelte',
  'fastify',
  'koa',
  'hapi',
  'nest',
  'nuxt',
  // Build tools
  'typescript',
  'webpack',
  'vite',
  'esbuild',
  'tsup',
  'rollup',
  'parcel',
  'babel',
  'swc',
  // Quality tools
  'prettier',
  'eslint',
  'vitest',
  'jest',
  'mocha',
  'chai',
  'sinon',
  'husky',
  'lint-staged',
  // Utilities
  'lodash',
  'axios',
  'chalk',
  'commander',
  'debug',
  'async',
  'uuid',
  'semver',
  'glob',
  'fs-extra',
  'mkdirp',
  'rimraf',
  'minimist',
  'yargs',
  'dotenv',
  'nanoid',
  'date-fns',
  'dayjs',
  'moment',
  'rxjs',
  'immer',
  // Validation
  'zod',
  'joi',
  'ajv',
  'yup',
  // HTTP / API
  'cors',
  'body-parser',
  'cookie-parser',
  'morgan',
  'helmet',
  'jsonwebtoken',
  'bcrypt',
  'passport',
  // Database
  'mongoose',
  'sequelize',
  'prisma',
  'typeorm',
  'knex',
  'pg',
  'mysql2',
  'redis',
  'ioredis',
  'better-sqlite3',
  // Realtime
  'socket.io',
  'ws',
  // State management
  'zustand',
  'redux',
  'mobx',
  // CSS
  'tailwindcss',
  'postcss',
  'autoprefixer',
  'sass',
  'styled-components',
  'clsx',
  'classnames',
  // Media
  'sharp',
  'puppeteer',
  'cheerio',
  'marked',
  'highlight.js',
  // Types
  'tslib',
];

export const DEFAULT_PYPI_ALLOWLIST: string[] = [
  // Web
  'requests',
  'flask',
  'django',
  'fastapi',
  'aiohttp',
  'httpx',
  'uvicorn',
  'gunicorn',
  'starlette',
  // Data
  'numpy',
  'pandas',
  'scipy',
  'matplotlib',
  'scikit-learn',
  'pillow',
  // Infrastructure
  'boto3',
  'botocore',
  'urllib3',
  'certifi',
  'charset-normalizer',
  'idna',
  // Core
  'setuptools',
  'pip',
  'wheel',
  'packaging',
  'typing-extensions',
  'six',
  'python-dateutil',
  'pyyaml',
  'tomli',
  'filelock',
  'attrs',
  'click',
  'importlib-metadata',
  'zipp',
  'platformdirs',
  // Crypto
  'cryptography',
  'cffi',
  'pycparser',
  'jmespath',
  'pyasn1',
  // DB
  'sqlalchemy',
  'psycopg2',
  'redis',
  'celery',
  // Template / Markup
  'jinja2',
  'markupsafe',
  'beautifulsoup4',
  'lxml',
  'scrapy',
  // Validation
  'pydantic',
  // Testing
  'pytest',
  'tox',
  'coverage',
  'mock',
];

export const DEFAULT_BLOCKLIST_EXACT: string[] = [
  // npm typosquats (historically malicious)
  'crossenv',
  'cross-env.js',
  'd3.js',
  'fabric-js',
  'ffmpegs',
  'gruntcli',
  'http-proxy.js',
  'jquery.js',
  'mongose',
  'mssql-node',
  'nodecaffe',
  'nodefabric',
  'nodemailer-js',
  'noderequest',
  'nodesass',
  'opencv.js',
  'openssl.js',
  'shadowsock',
  'sqliter',
  'sqlserver',
  // npm compromised
  'flatmap-stream',
  // PyPI typosquats
  'colourama',
  'python3-dateutil',
  'requesocks',
  'requesst',
  'beautifulsup',
  'numppy',
  'numpys',
  'djanga',
  'urlib3',
];

export const DEFAULT_BLOCKLIST_PATTERNS: RegExp[] = [
  /-free-download$/,
  /-crack$/,
  /-keygen$/,
  /-license-key$/,
  /-hack$/,
  /-serial$/,
  /-activation$/,
  /-premium-free$/,
  /-generator-free$/,
];

export interface AllowBlockConfig {
  allowlist: string[];
  blocklist: string[];
  blocklistPatterns: RegExp[];
}

/**
 * Build merged allow/block lists from defaults + user config.
 */
export function buildAllowBlockLists(
  ecosystem: 'npm' | 'pypi' | 'crates.io',
  userAllowlist: string[],
  userBlocklist: string[],
  userBlocklistPatterns: string[],
): AllowBlockConfig {
  const base =
    ecosystem === 'npm'
      ? DEFAULT_NPM_ALLOWLIST
      : ecosystem === 'pypi'
        ? DEFAULT_PYPI_ALLOWLIST
        : [];

  return {
    allowlist: [...base, ...userAllowlist],
    blocklist: [...DEFAULT_BLOCKLIST_EXACT, ...userBlocklist],
    blocklistPatterns: [
      ...DEFAULT_BLOCKLIST_PATTERNS,
      ...userBlocklistPatterns.map((p) => new RegExp(p)),
    ],
  };
}

/**
 * Check if a package is on the allowlist.
 */
export function isAllowlisted(name: string, allowlist: string[]): boolean {
  return allowlist.includes(name);
}

/**
 * Check if a package is on the blocklist (exact match or pattern).
 */
export function isBlocklisted(
  name: string,
  blocklist: string[],
  blocklistPatterns: RegExp[],
): boolean {
  if (blocklist.includes(name)) return true;
  return blocklistPatterns.some((p) => p.test(name));
}
