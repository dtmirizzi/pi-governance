export type DlpSeverity = 'low' | 'medium' | 'high' | 'critical';
export type DlpCategory = 'secret' | 'pii' | 'custom';

export interface DlpPatternDef {
  name: string;
  pattern: RegExp;
  severity: DlpSeverity;
  category: DlpCategory;
}

export const SECRET_PATTERNS: DlpPatternDef[] = [
  // AWS
  {
    name: 'aws_access_key',
    pattern: /\b(AKIA[0-9A-Z]{16})\b/g,
    severity: 'critical',
    category: 'secret',
  },
  {
    name: 'aws_secret_key',
    pattern: /\b([A-Za-z0-9/+=]{40})(?=\s|$|"|')/g,
    severity: 'critical',
    category: 'secret',
  },

  // GitHub
  {
    name: 'github_pat',
    pattern: /\b(ghp_[A-Za-z0-9]{36,})\b/g,
    severity: 'critical',
    category: 'secret',
  },
  {
    name: 'github_oauth',
    pattern: /\b(gho_[A-Za-z0-9]{36,})\b/g,
    severity: 'high',
    category: 'secret',
  },
  {
    name: 'github_app_token',
    pattern: /\b(ghu_[A-Za-z0-9]{36,})\b/g,
    severity: 'high',
    category: 'secret',
  },

  // Anthropic
  {
    name: 'anthropic_api_key',
    pattern: /\b(sk-ant-api03-[A-Za-z0-9_-]{90,})\b/g,
    severity: 'critical',
    category: 'secret',
  },

  // OpenAI
  {
    name: 'openai_api_key',
    pattern: /\b(sk-[A-Za-z0-9]{20,}T3BlbkFJ[A-Za-z0-9]{20,})\b/g,
    severity: 'critical',
    category: 'secret',
  },

  // JWT
  {
    name: 'jwt_token',
    pattern: /\b(eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/g,
    severity: 'high',
    category: 'secret',
  },

  // Private key headers
  {
    name: 'private_key',
    pattern: /-----BEGIN\s+(RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
    severity: 'critical',
    category: 'secret',
  },

  // Database connection strings
  {
    name: 'database_url',
    pattern: /\b((?:postgres|mysql|mongodb|redis):\/\/[^\s'"]{10,})\b/g,
    severity: 'high',
    category: 'secret',
  },

  // Slack
  {
    name: 'slack_token',
    pattern: /\b(xox[bpras]-[A-Za-z0-9-]{10,})\b/g,
    severity: 'high',
    category: 'secret',
  },

  // Stripe
  {
    name: 'stripe_key',
    pattern: /\b([rs]k_(?:live|test)_[A-Za-z0-9]{20,})\b/g,
    severity: 'critical',
    category: 'secret',
  },

  // npm
  {
    name: 'npm_token',
    pattern: /\b(npm_[A-Za-z0-9]{36,})\b/g,
    severity: 'high',
    category: 'secret',
  },

  // SendGrid
  {
    name: 'sendgrid_key',
    pattern: /\b(SG\.[A-Za-z0-9_-]{22,}\.[A-Za-z0-9_-]{22,})\b/g,
    severity: 'high',
    category: 'secret',
  },

  // Generic API key patterns (env-var style assignments)
  {
    name: 'generic_api_key',
    pattern:
      /\b(?:API_KEY|API_SECRET|ACCESS_TOKEN|AUTH_TOKEN|SECRET_KEY)\s*[=:]\s*['"]?([A-Za-z0-9_-]{16,})['"]?/gi,
    severity: 'medium',
    category: 'secret',
  },

  // High-entropy string near keyword context
  {
    name: 'generic_secret_assignment',
    pattern: /\b(?:password|passwd|secret|token|credential)\s*[=:]\s*['"]([^'"]{8,})['"]?/gi,
    severity: 'medium',
    category: 'secret',
  },
];

export const PII_PATTERNS: DlpPatternDef[] = [
  // SSN (US)
  {
    name: 'ssn',
    pattern: /\b(\d{3}-\d{2}-\d{4})\b/g,
    severity: 'critical',
    category: 'pii',
  },

  // Credit card numbers
  {
    name: 'credit_card',
    pattern:
      /\b(4\d{3}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}|5[1-5]\d{2}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}|3[47]\d{2}[\s-]?\d{6}[\s-]?\d{5}|6(?:011|5\d{2})[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})\b/g,
    severity: 'critical',
    category: 'pii',
  },

  // Email address
  {
    name: 'email',
    pattern: /\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g,
    severity: 'low',
    category: 'pii',
  },

  // US phone number
  {
    name: 'phone_us',
    pattern: /\b(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})\b/g,
    severity: 'medium',
    category: 'pii',
  },

  // IPv4 address
  {
    name: 'ipv4',
    pattern:
      /\b((?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?))\b/g,
    severity: 'low',
    category: 'pii',
  },
];
