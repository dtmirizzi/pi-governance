import type { GovernanceConfig } from './schema.js';

export const DEFAULTS: GovernanceConfig = {
  auth: {
    provider: 'env',
    env: {
      user_var: 'GRWND_USER',
      role_var: 'GRWND_ROLE',
      org_unit_var: 'GRWND_ORG_UNIT',
    },
  },
  policy: {
    engine: 'yaml',
    yaml: {
      rules_file: './governance-rules.yaml',
    },
  },
  templates: {
    directory: './templates/',
    default: 'project-lead',
  },
  hitl: {
    default_mode: 'supervised',
    approval_channel: 'cli',
    timeout_seconds: 300,
  },
  audit: {
    sinks: [{ type: 'jsonl', path: '~/.pi/agent/audit.jsonl' }],
  },
  dlp: {
    enabled: true,
    mode: 'audit',
    on_input: 'block',
    on_output: 'mask',
    masking: {
      strategy: 'partial',
      show_chars: 4,
      placeholder: '***',
    },
    severity_threshold: 'low',
    built_in: {
      secrets: true,
      pii: true,
    },
  },
};
