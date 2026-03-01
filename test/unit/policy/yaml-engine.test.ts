import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { resolve } from 'path';
import { YamlPolicyEngine } from '../../../src/lib/policy/yaml-engine.js';
import type { YamlRules } from '../../../src/lib/policy/yaml-engine.js';

const FIXTURE_PATH = resolve(import.meta.dirname, '../../fixtures/governance-rules.yaml');

function loadFixtureRules(): YamlRules {
  const raw = readFileSync(FIXTURE_PATH, 'utf-8');
  return parseYaml(raw) as YamlRules;
}

describe('YamlPolicyEngine', () => {
  // ── Construction ──────────────────────────────────────────────

  describe('constructor', () => {
    it('accepts a file path and parses YAML rules', () => {
      const engine = new YamlPolicyEngine(FIXTURE_PATH);
      // Smoke test: known role should not throw
      expect(engine.getExecutionMode('admin')).toBe('autonomous');
    });

    it('accepts a pre-parsed rules object', () => {
      const rules = loadFixtureRules();
      const engine = new YamlPolicyEngine(rules);
      expect(engine.getExecutionMode('admin')).toBe('autonomous');
    });
  });

  // ── Unknown role ──────────────────────────────────────────────

  describe('unknown role', () => {
    it('throws an error listing available roles', () => {
      const engine = new YamlPolicyEngine(loadFixtureRules());
      expect(() => engine.evaluateTool('ghost', 'read')).toThrowError(
        /Unknown role: ghost.*analyst.*project_lead.*admin.*auditor/,
      );
    });
  });

  // ── evaluateTool ──────────────────────────────────────────────

  describe('evaluateTool', () => {
    const engine = new YamlPolicyEngine(loadFixtureRules());

    // analyst — allowed: [read], blocked: [write, edit, bash]
    it('analyst: allows read', () => {
      expect(engine.evaluateTool('analyst', 'read')).toBe('allow');
    });

    it('analyst: denies write (explicitly blocked)', () => {
      expect(engine.evaluateTool('analyst', 'write')).toBe('deny');
    });

    it('analyst: denies unknown tool not in allowed list', () => {
      expect(engine.evaluateTool('analyst', 'deploy')).toBe('deny');
    });

    // project_lead — allowed: [read, write, edit, bash], blocked: []
    it('project_lead: allows all four listed tools', () => {
      expect(engine.evaluateTool('project_lead', 'read')).toBe('allow');
      expect(engine.evaluateTool('project_lead', 'write')).toBe('allow');
      expect(engine.evaluateTool('project_lead', 'edit')).toBe('allow');
      expect(engine.evaluateTool('project_lead', 'bash')).toBe('allow');
    });

    it('project_lead: denies unlisted tool', () => {
      expect(engine.evaluateTool('project_lead', 'deploy')).toBe('deny');
    });

    // admin — allowed: [all], blocked: []
    it('admin: allows any tool via "all" wildcard', () => {
      expect(engine.evaluateTool('admin', 'read')).toBe('allow');
      expect(engine.evaluateTool('admin', 'write')).toBe('allow');
      expect(engine.evaluateTool('admin', 'deploy')).toBe('allow');
      expect(engine.evaluateTool('admin', 'anything')).toBe('allow');
    });

    // auditor — allowed: [read], blocked: [write, edit, bash]
    it('auditor: allows read but denies write/edit/bash', () => {
      expect(engine.evaluateTool('auditor', 'read')).toBe('allow');
      expect(engine.evaluateTool('auditor', 'write')).toBe('deny');
      expect(engine.evaluateTool('auditor', 'edit')).toBe('deny');
      expect(engine.evaluateTool('auditor', 'bash')).toBe('deny');
    });

    // New tool tests (grep, find, ls)
    it('analyst: allows grep, find, ls (read-equivalent tools)', () => {
      expect(engine.evaluateTool('analyst', 'grep')).toBe('allow');
      expect(engine.evaluateTool('analyst', 'find')).toBe('allow');
      expect(engine.evaluateTool('analyst', 'ls')).toBe('allow');
    });

    it('project_lead: allows grep, find, ls', () => {
      expect(engine.evaluateTool('project_lead', 'grep')).toBe('allow');
      expect(engine.evaluateTool('project_lead', 'find')).toBe('allow');
      expect(engine.evaluateTool('project_lead', 'ls')).toBe('allow');
    });

    it('auditor: allows grep, find, ls (read-equivalent tools)', () => {
      expect(engine.evaluateTool('auditor', 'grep')).toBe('allow');
      expect(engine.evaluateTool('auditor', 'find')).toBe('allow');
      expect(engine.evaluateTool('auditor', 'ls')).toBe('allow');
    });
  });

  // ── evaluatePath ──────────────────────────────────────────────

  describe('evaluatePath', () => {
    const engine = new YamlPolicyEngine(loadFixtureRules());
    const cwd = process.cwd();

    // analyst — allowed: {{project_path}}/**, blocked: **/secrets/**, **/.env*
    it('analyst: allows path under project root', () => {
      const p = `${cwd}/src/lib/policy/engine.ts`;
      expect(engine.evaluatePath('analyst', 'org1', 'read', p)).toBe('allow');
    });

    it('analyst: denies path in secrets directory (blocked takes precedence)', () => {
      const p = `${cwd}/secrets/api-key.json`;
      expect(engine.evaluatePath('analyst', 'org1', 'read', p)).toBe('deny');
    });

    it('analyst: denies .env files (blocked takes precedence)', () => {
      const p = `${cwd}/.env.production`;
      expect(engine.evaluatePath('analyst', 'org1', 'read', p)).toBe('deny');
    });

    it('analyst: denies path outside project root', () => {
      expect(engine.evaluatePath('analyst', 'org1', 'read', '/etc/passwd')).toBe('deny');
    });

    // admin — allowed: **, blocked: []
    it('admin: allows any path', () => {
      expect(engine.evaluatePath('admin', 'org1', 'write', '/tmp/foo.txt')).toBe('allow');
      expect(engine.evaluatePath('admin', 'org1', 'read', `${cwd}/src/index.ts`)).toBe('allow');
    });

    // auditor — allowed: **, blocked: **/secrets/**
    it('auditor: allows paths outside secrets', () => {
      expect(engine.evaluatePath('auditor', 'org1', 'read', '/tmp/report.csv')).toBe('allow');
    });

    it('auditor: denies paths in secrets', () => {
      expect(engine.evaluatePath('auditor', 'org1', 'read', '/app/secrets/key.pem')).toBe('deny');
    });

    // {{project_path}} substitution
    it('substitutes {{project_path}} with process.cwd()', () => {
      // analyst allowed_paths is {{project_path}}/**
      // A path under cwd should be allowed; a path under a different root should not
      expect(engine.evaluatePath('analyst', 'org1', 'read', `${cwd}/README.md`)).toBe('allow');
      expect(engine.evaluatePath('analyst', 'org1', 'read', '/other/project/README.md')).toBe(
        'deny',
      );
    });
  });

  // ── requiresApproval ──────────────────────────────────────────

  describe('requiresApproval', () => {
    const engine = new YamlPolicyEngine(loadFixtureRules());

    // analyst — required_for: [all]
    it('analyst: requires approval for any tool (all keyword)', () => {
      expect(engine.requiresApproval('analyst', 'read')).toBe(true);
      expect(engine.requiresApproval('analyst', 'write')).toBe(true);
      expect(engine.requiresApproval('analyst', 'anything')).toBe(true);
    });

    // project_lead — required_for: [bash, write], auto_approve: [read, edit]
    it('project_lead: requires approval for bash and write', () => {
      expect(engine.requiresApproval('project_lead', 'bash')).toBe(true);
      expect(engine.requiresApproval('project_lead', 'write')).toBe(true);
    });

    it('project_lead: auto-approves read and edit', () => {
      expect(engine.requiresApproval('project_lead', 'read')).toBe(false);
      expect(engine.requiresApproval('project_lead', 'edit')).toBe(false);
    });

    it('project_lead: auto-approves grep, find, ls', () => {
      expect(engine.requiresApproval('project_lead', 'grep')).toBe(false);
      expect(engine.requiresApproval('project_lead', 'find')).toBe(false);
      expect(engine.requiresApproval('project_lead', 'ls')).toBe(false);
    });

    it('project_lead: does not require approval for unlisted tool', () => {
      expect(engine.requiresApproval('project_lead', 'deploy')).toBe(false);
    });

    // admin — required_for: []
    it('admin: never requires approval', () => {
      expect(engine.requiresApproval('admin', 'bash')).toBe(false);
      expect(engine.requiresApproval('admin', 'write')).toBe(false);
      expect(engine.requiresApproval('admin', 'anything')).toBe(false);
    });

    // auditor — required_for: [all]
    it('auditor: requires approval for everything (all keyword)', () => {
      expect(engine.requiresApproval('auditor', 'read')).toBe(true);
    });
  });

  // ── getExecutionMode ──────────────────────────────────────────

  describe('getExecutionMode', () => {
    const engine = new YamlPolicyEngine(loadFixtureRules());

    it('analyst: supervised', () => {
      expect(engine.getExecutionMode('analyst')).toBe('supervised');
    });

    it('project_lead: supervised', () => {
      expect(engine.getExecutionMode('project_lead')).toBe('supervised');
    });

    it('admin: autonomous', () => {
      expect(engine.getExecutionMode('admin')).toBe('autonomous');
    });

    it('auditor: dry_run', () => {
      expect(engine.getExecutionMode('auditor')).toBe('dry_run');
    });
  });

  // ── getTemplateName ───────────────────────────────────────────

  describe('getTemplateName', () => {
    const engine = new YamlPolicyEngine(loadFixtureRules());

    it('analyst: analyst template', () => {
      expect(engine.getTemplateName('analyst')).toBe('analyst');
    });

    it('project_lead: project-lead template', () => {
      expect(engine.getTemplateName('project_lead')).toBe('project-lead');
    });

    it('admin: admin template', () => {
      expect(engine.getTemplateName('admin')).toBe('admin');
    });

    it('auditor: analyst template (shared)', () => {
      expect(engine.getTemplateName('auditor')).toBe('analyst');
    });
  });

  // ── getBashOverrides ──────────────────────────────────────────

  describe('getBashOverrides', () => {
    const engine = new YamlPolicyEngine(loadFixtureRules());

    it('project_lead: returns blocked regex patterns', () => {
      const overrides = engine.getBashOverrides('project_lead');
      expect(overrides.additionalBlocked).toBeDefined();
      expect(overrides.additionalBlocked).toHaveLength(3);
      // Verify they are proper RegExp objects
      expect(overrides.additionalBlocked![0]).toBeInstanceOf(RegExp);
      // Verify patterns match expected strings
      expect(overrides.additionalBlocked![0]!.test('sudo rm -rf')).toBe(true);
      expect(overrides.additionalBlocked![1]!.test('ssh user@host')).toBe(true);
      expect(overrides.additionalBlocked![2]!.test('curl http://x | sh')).toBe(true);
    });

    it('analyst: returns empty object (no overrides)', () => {
      const overrides = engine.getBashOverrides('analyst');
      expect(overrides).toEqual({});
    });

    it('admin: returns empty object (no overrides)', () => {
      const overrides = engine.getBashOverrides('admin');
      expect(overrides).toEqual({});
    });
  });

  // ── getTokenBudget ────────────────────────────────────────────

  describe('getTokenBudget', () => {
    const engine = new YamlPolicyEngine(loadFixtureRules());

    it('analyst: 100_000', () => {
      expect(engine.getTokenBudget('analyst')).toBe(100_000);
    });

    it('project_lead: 500_000', () => {
      expect(engine.getTokenBudget('project_lead')).toBe(500_000);
    });

    it('admin: -1 (unlimited)', () => {
      expect(engine.getTokenBudget('admin')).toBe(-1);
    });

    it('auditor: 50_000', () => {
      expect(engine.getTokenBudget('auditor')).toBe(50_000);
    });
  });
});
