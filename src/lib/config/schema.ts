import { Type, type Static } from '@sinclair/typebox';

const AuthEnvConfig = Type.Object({
  user_var: Type.String({ default: 'GRWND_USER' }),
  role_var: Type.String({ default: 'GRWND_ROLE' }),
  org_unit_var: Type.String({ default: 'GRWND_ORG_UNIT' }),
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

export const GovernanceConfigSchema = Type.Object({
  auth: Type.Optional(AuthConfig),
  policy: Type.Optional(PolicyConfig),
  templates: Type.Optional(TemplatesConfig),
  hitl: Type.Optional(HitlConfig),
  audit: Type.Optional(AuditConfig),
  org_units: Type.Optional(Type.Record(Type.String(), OrgUnitOverride)),
});

export type GovernanceConfig = Static<typeof GovernanceConfigSchema>;
