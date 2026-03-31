import { describe, it, expect } from 'vitest';
import { parseInstallCommand } from '../../../src/lib/deps/parser.js';

describe('parseInstallCommand', () => {
  describe('npm', () => {
    it('parses npm install with packages', () => {
      const result = parseInstallCommand('npm install express lodash');
      expect(result).toBeDefined();
      expect(result!.manager).toBe('npm');
      expect(result!.packages).toHaveLength(2);
      expect(result!.packages[0]!.name).toBe('express');
      expect(result!.packages[1]!.name).toBe('lodash');
      expect(result!.packages[0]!.ecosystem).toBe('npm');
    });

    it('parses npm i shorthand', () => {
      const result = parseInstallCommand('npm i axios');
      expect(result!.manager).toBe('npm');
      expect(result!.packages[0]!.name).toBe('axios');
    });

    it('parses npm add', () => {
      const result = parseInstallCommand('npm add react');
      expect(result!.packages[0]!.name).toBe('react');
    });

    it('parses scoped packages', () => {
      const result = parseInstallCommand('npm install @types/node @babel/core');
      expect(result!.packages).toHaveLength(2);
      expect(result!.packages[0]!.name).toBe('@types/node');
      expect(result!.packages[1]!.name).toBe('@babel/core');
    });

    it('parses versioned packages', () => {
      const result = parseInstallCommand('npm install express@4.18.0');
      expect(result!.packages[0]!.name).toBe('express');
      expect(result!.packages[0]!.version).toBe('4.18.0');
    });

    it('skips flags', () => {
      const result = parseInstallCommand('npm install -D @types/node');
      expect(result!.packages).toHaveLength(1);
      expect(result!.packages[0]!.name).toBe('@types/node');
      expect(result!.flags).toContain('-D');
    });

    it('detects npm ci as lockfile install', () => {
      const result = parseInstallCommand('npm ci');
      expect(result!.isLockfileInstall).toBe(true);
      expect(result!.packages).toHaveLength(0);
    });

    it('detects custom registry', () => {
      const result = parseInstallCommand(
        'npm install express --registry=https://custom.example.com',
      );
      expect(result!.usesCustomRegistry).toBe(true);
    });
  });

  describe('yarn', () => {
    it('parses yarn add', () => {
      const result = parseInstallCommand('yarn add react react-dom');
      expect(result!.manager).toBe('yarn');
      expect(result!.packages).toHaveLength(2);
      expect(result!.packages[0]!.name).toBe('react');
      expect(result!.packages[1]!.name).toBe('react-dom');
    });
  });

  describe('pnpm', () => {
    it('parses pnpm add', () => {
      const result = parseInstallCommand('pnpm add typescript');
      expect(result!.manager).toBe('pnpm');
      expect(result!.packages[0]!.name).toBe('typescript');
    });

    it('parses pnpm install with packages', () => {
      const result = parseInstallCommand('pnpm install lodash');
      expect(result!.packages[0]!.name).toBe('lodash');
    });
  });

  describe('pip', () => {
    it('parses pip install', () => {
      const result = parseInstallCommand('pip install requests flask');
      expect(result!.manager).toBe('pip');
      expect(result!.packages).toHaveLength(2);
      expect(result!.packages[0]!.name).toBe('requests');
      expect(result!.packages[0]!.ecosystem).toBe('pypi');
    });

    it('parses versioned pip packages', () => {
      const result = parseInstallCommand('pip install requests==2.31.0');
      expect(result!.packages[0]!.name).toBe('requests');
      expect(result!.packages[0]!.version).toBe('==2.31.0');
    });

    it('skips -r requirements.txt', () => {
      const result = parseInstallCommand('pip install -r requirements.txt');
      expect(result!.packages).toHaveLength(0);
    });

    it('detects custom index URL', () => {
      const result = parseInstallCommand(
        'pip install flask --index-url https://custom.pypi.example.com',
      );
      expect(result!.usesCustomRegistry).toBe(true);
    });

    it('skips URL-based installs', () => {
      const result = parseInstallCommand('pip install https://example.com/package.tar.gz');
      expect(result!.packages).toHaveLength(0);
    });
  });

  describe('cargo', () => {
    it('parses cargo add', () => {
      const result = parseInstallCommand('cargo add serde tokio');
      expect(result!.manager).toBe('cargo');
      expect(result!.packages).toHaveLength(2);
      expect(result!.packages[0]!.ecosystem).toBe('crates.io');
    });

    it('parses cargo install', () => {
      const result = parseInstallCommand('cargo install ripgrep');
      expect(result!.packages[0]!.name).toBe('ripgrep');
    });
  });

  describe('non-install commands', () => {
    it('returns undefined for non-install commands', () => {
      expect(parseInstallCommand('ls -la')).toBeUndefined();
      expect(parseInstallCommand('git status')).toBeUndefined();
      expect(parseInstallCommand('npm list')).toBeUndefined();
      expect(parseInstallCommand('pip show flask')).toBeUndefined();
    });
  });
});
