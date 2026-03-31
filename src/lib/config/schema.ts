import { Type, type Static } from '@sinclair/typebox';

const AuthEnvConfig = Type.Object({
  user_var: Type.String({ default: 'PI_GOV_USER' }),
  role_var: Type.String({ default: 'PI_GOV_ROLE' }),
  org_unit_var: Type.String({ default: 'PI_GOV_ORG_UNIT' }),
});

const AuthLocalConfig = Type.Object({
  users_file: Type.String({ default: './users.yaml' }),
});

const AuthConfig = Type.Object({
  provider: Type.Union([Type.Literal('env'), Type.Literal('local'), Type.Literal('oidc')], {
    default: 'env',
  }),
  env: Type.Optional(AuthEnvConfig),
  local: Type.Optional(AuthLocalConfig),
});

export type AuthConfigType = Static<typeof AuthConfig>;

const YamlPolicyConfig = Type.Object({
  rules_file: Type.String({ default: './governance-rules.yaml' }),
});

const OsoPolicyConfig = Type.Object({
  polar_files: Type.Array(Type.String(), {
    default: ['./policies/base.polar', './policies/tools.polar'],
  }),
});

const PolicyConfig = Type.Object({
  engine: Type.Union([Type.Literal('yaml'), Type.Literal('oso')], { default: 'yaml' }),
  yaml: Type.Optional(YamlPolicyConfig),
  oso: Type.Optional(OsoPolicyConfig),
});

const TemplatesConfig = Type.Object({
  directory: Type.String({ default: './templates/' }),
  default: Type.String({ default: 'project-lead' }),
});

const HitlWebhookConfig = Type.Object({
  url: Type.String(),
});

const HitlConfig = Type.Object({
  default_mode: Type.Union(
    [Type.Literal('autonomous'), Type.Literal('supervised'), Type.Literal('dry_run')],
    { default: 'supervised' },
  ),
  approval_channel: Type.Union([Type.Literal('cli'), Type.Literal('webhook')], { default: 'cli' }),
  timeout_seconds: Type.Number({ default: 300, minimum: 10, maximum: 3600 }),
  webhook: Type.Optional(HitlWebhookConfig),
});

const JsonlSinkConfig = Type.Object({
  type: Type.Literal('jsonl'),
  path: Type.String({ default: '~/.pi/agent/audit.jsonl' }),
});

const WebhookSinkConfig = Type.Object({
  type: Type.Literal('webhook'),
  url: Type.String(),
});

const PostgresSinkConfig = Type.Object({
  type: Type.Literal('postgres'),
  connection: Type.String(),
});

const AuditSinkConfig = Type.Union([JsonlSinkConfig, WebhookSinkConfig, PostgresSinkConfig]);

const AuditConfig = Type.Object({
  sinks: Type.Array(AuditSinkConfig, {
    default: [{ type: 'jsonl', path: '~/.pi/agent/audit.jsonl' }],
  }),
});

const OrgUnitOverride = Type.Object({
  hitl: Type.Optional(Type.Partial(HitlConfig)),
  policy: Type.Optional(
    Type.Object({
      extra_polar: Type.Optional(Type.String()),
      extra_rules: Type.Optional(Type.String()),
    }),
  ),
});

// --- DLP (Data Loss Prevention) ---

const DlpMaskingConfig = Type.Object({
  strategy: Type.Union([Type.Literal('partial'), Type.Literal('full'), Type.Literal('hash')], {
    default: 'partial',
  }),
  show_chars: Type.Optional(Type.Number({ default: 4, minimum: 0 })),
  placeholder: Type.Optional(Type.String({ default: '***' })),
});

const DlpCustomPatternConfig = Type.Object({
  name: Type.String(),
  pattern: Type.String(),
  severity: Type.Union([
    Type.Literal('low'),
    Type.Literal('medium'),
    Type.Literal('high'),
    Type.Literal('critical'),
  ]),
  action: Type.Optional(
    Type.Union([Type.Literal('audit'), Type.Literal('mask'), Type.Literal('block')]),
  ),
});

const DlpAllowlistEntryConfig = Type.Object({
  pattern: Type.String(),
});

const DlpRoleOverrideConfig = Type.Object({
  enabled: Type.Optional(Type.Boolean()),
  mode: Type.Optional(
    Type.Union([Type.Literal('audit'), Type.Literal('mask'), Type.Literal('block')]),
  ),
  on_input: Type.Optional(
    Type.Union([Type.Literal('audit'), Type.Literal('mask'), Type.Literal('block')]),
  ),
  on_output: Type.Optional(
    Type.Union([Type.Literal('audit'), Type.Literal('mask'), Type.Literal('block')]),
  ),
});

const DlpConfig = Type.Object({
  enabled: Type.Boolean({ default: false }),
  mode: Type.Optional(
    Type.Union([Type.Literal('audit'), Type.Literal('mask'), Type.Literal('block')], {
      default: 'audit',
    }),
  ),
  on_input: Type.Optional(
    Type.Union([Type.Literal('audit'), Type.Literal('mask'), Type.Literal('block')]),
  ),
  on_output: Type.Optional(
    Type.Union([Type.Literal('audit'), Type.Literal('mask'), Type.Literal('block')]),
  ),
  masking: Type.Optional(DlpMaskingConfig),
  severity_threshold: Type.Optional(
    Type.Union(
      [Type.Literal('low'), Type.Literal('medium'), Type.Literal('high'), Type.Literal('critical')],
      { default: 'low' },
    ),
  ),
  built_in: Type.Optional(
    Type.Object({
      secrets: Type.Boolean({ default: true }),
      pii: Type.Boolean({ default: true }),
    }),
  ),
  custom_patterns: Type.Optional(Type.Array(DlpCustomPatternConfig)),
  allowlist: Type.Optional(Type.Array(DlpAllowlistEntryConfig)),
  role_overrides: Type.Optional(Type.Record(Type.String(), DlpRoleOverrideConfig)),
});

export type DlpConfigType = Static<typeof DlpConfig>;

// --- Dependency Guardian ---

const DependencyGuardianChecksConfig = Type.Object({
  existence: Type.Boolean({ default: true }),
  reputation: Type.Boolean({ default: true }),
  typosquatting: Type.Boolean({ default: true }),
  install_scripts: Type.Boolean({ default: true }),
  vulnerabilities: Type.Boolean({ default: true }),
});

const DependencyGuardianConfig = Type.Object({
  enabled: Type.Boolean({ default: true }),
  checks: Type.Optional(DependencyGuardianChecksConfig),
  risk_thresholds: Type.Optional(
    Type.Object({
      min_age_days: Type.Number({ default: 30, minimum: 0 }),
      min_weekly_downloads: Type.Number({ default: 100, minimum: 0 }),
    }),
  ),
  on_risk: Type.Optional(
    Type.Union([Type.Literal('escalate'), Type.Literal('block'), Type.Literal('audit')], {
      default: 'escalate',
    }),
  ),
  allowlist: Type.Optional(Type.Array(Type.String())),
  blocklist: Type.Optional(Type.Array(Type.String())),
  blocklist_patterns: Type.Optional(Type.Array(Type.String())),
  custom_registry_bypass: Type.Boolean({ default: true }),
});

export type DependencyGuardianConfigType = Static<typeof DependencyGuardianConfig>;

export const GovernanceConfigSchema = Type.Object({
  auth: Type.Optional(AuthConfig),
  policy: Type.Optional(PolicyConfig),
  templates: Type.Optional(TemplatesConfig),
  hitl: Type.Optional(HitlConfig),
  audit: Type.Optional(AuditConfig),
  dlp: Type.Optional(DlpConfig),
  dependency_guardian: Type.Optional(DependencyGuardianConfig),
  org_units: Type.Optional(Type.Record(Type.String(), OrgUnitOverride)),
});

export type GovernanceConfig = Static<typeof GovernanceConfigSchema>;
