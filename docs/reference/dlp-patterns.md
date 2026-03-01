# DLP Patterns Reference

Complete list of built-in DLP detection patterns.

## Secret patterns

| Name                        | Severity | Regex                                         | Example                                  |
| --------------------------- | -------- | --------------------------------------------- | ---------------------------------------- |
| `aws_access_key`            | critical | `AKIA[0-9A-Z]{16}`                            | `AKIAIOSFODNN7EXAMPLE`                   |
| `aws_secret_key`            | critical | `[A-Za-z0-9/+=]{40}`                          | 40-char base64 string                    |
| `github_pat`                | critical | `ghp_[A-Za-z0-9]{36,}`                        | `ghp_ABCDEFGHabcdefgh1234567890abcdefgh` |
| `github_oauth`              | high     | `gho_[A-Za-z0-9]{36,}`                        | `gho_ABCDEFGHabcdefgh1234567890abcdefgh` |
| `github_app_token`          | high     | `ghu_[A-Za-z0-9]{36,}`                        | `ghu_ABCDEFGHabcdefgh1234567890abcdefgh` |
| `anthropic_api_key`         | critical | `sk-ant-api03-[A-Za-z0-9_-]{90,}`             | `sk-ant-api03-...`                       |
| `openai_api_key`            | critical | `sk-[A-Za-z0-9]{20,}T3BlbkFJ[A-Za-z0-9]{20,}` | `sk-...T3BlbkFJ...`                      |
| `jwt_token`                 | high     | `eyJ...\.eyJ...\....`                         | `eyJhbGciOiJIUzI1NiJ9.eyJzdWIi...`       |
| `private_key`               | critical | `-----BEGIN ... PRIVATE KEY-----`             | PEM private key header                   |
| `database_url`              | high     | `(postgres\|mysql\|mongodb\|redis)://...`     | `postgres://user:pass@host/db`           |
| `slack_token`               | high     | `xox[bpras]-[A-Za-z0-9-]{10,}`                | `xoxb-1234567890-abcdefghij`             |
| `stripe_key`                | critical | `[rs]k_(live\|test)_[A-Za-z0-9]{20,}`         | `sk_live_ABCDabcd12345678901234`         |
| `npm_token`                 | high     | `npm_[A-Za-z0-9]{36,}`                        | `npm_ABCDEFGHabcdefgh1234567890abcdefgh` |
| `sendgrid_key`              | high     | `SG\.[A-Za-z0-9_-]{22,}\.[A-Za-z0-9_-]{22,}`  | `SG.abc123.def456`                       |
| `generic_api_key`           | medium   | `(API_KEY\|API_SECRET\|...)=[value]`          | `API_KEY=abc123def456`                   |
| `generic_secret_assignment` | medium   | `(password\|secret\|token\|...)="value"`      | `password="mysecret"`                    |

## PII patterns

| Name          | Severity | Regex                                | Example               |
| ------------- | -------- | ------------------------------------ | --------------------- |
| `ssn`         | critical | `\d{3}-\d{2}-\d{4}`                  | `123-45-6789`         |
| `credit_card` | critical | Visa/MC/Amex/Discover formats        | `4111 1111 1111 1111` |
| `email`       | low      | `[user]@[domain].[tld]`              | `user@example.com`    |
| `phone_us`    | medium   | US phone number formats              | `(555) 123-4567`      |
| `ipv4`        | low      | `\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}` | `192.168.1.100`       |

## Severity levels

| Level      | Meaning                                            | Examples                                   |
| ---------- | -------------------------------------------------- | ------------------------------------------ |
| `low`      | Potentially sensitive, common in normal text       | email, IP address                          |
| `medium`   | Likely sensitive, may be intentional               | phone numbers, generic assignments         |
| `high`     | Almost certainly sensitive                         | JWTs, Slack tokens, database URLs          |
| `critical` | Definitely sensitive, never belongs in LLM context | AWS keys, private keys, SSNs, credit cards |

## Custom patterns

You can add custom patterns via the `dlp.custom_patterns` config:

```yaml
dlp:
  custom_patterns:
    - name: internal_key
      pattern: 'grwnd_[a-zA-Z0-9]{32}'
      severity: critical
      action: block
```

Custom patterns use the `custom` category and are evaluated alongside built-in patterns.
