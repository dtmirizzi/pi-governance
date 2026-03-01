# Data Loss Prevention

pi-governance's DLP module prevents sensitive data — API keys, tokens, PII — from leaking through tool calls to LLM providers.

## Why DLP matters

When an agent reads a `.env` file or a user pastes credentials into a bash command, those secrets flow through the tool pipeline unfiltered. DLP intercepts these flows at two points:

- **Tool call inputs** (pre-execution): scans text before the tool runs. Can **block** or **mask** sensitive data.
- **Tool result outputs** (post-execution): scans output before it reaches the LLM. Can **mask** sensitive data in-place.

## Quick setup

Add a `dlp` section to your `governance.yaml`:

```yaml
dlp:
  enabled: true
  mode: mask
```

DLP is **disabled by default** — existing users are unaffected.

## Action modes

### `audit` — detect and log only

```yaml
dlp:
  enabled: true
  mode: audit
```

Detects sensitive data and logs `dlp_detected` audit events, but does not block or modify tool calls.

### `mask` — redact sensitive values

```yaml
dlp:
  enabled: true
  mode: mask
  masking:
    strategy: partial
    show_chars: 4
```

Redacts matched values in-place. A GitHub PAT like `ghp_ABCDabcd1234` becomes `***1234`.

### `block` — deny tool calls

```yaml
dlp:
  enabled: true
  mode: block
```

Blocks tool calls that contain sensitive data in inputs. For outputs, `block` degrades to `mask` (the tool has already executed).

## Built-in patterns

DLP ships with ~15 secret patterns and ~5 PII patterns:

**Secrets**: AWS access keys, GitHub PATs/OAuth/app tokens, Anthropic API keys, OpenAI API keys, JWTs, private key headers, database connection strings, Slack tokens, Stripe keys, npm tokens, SendGrid keys, generic `API_KEY=...` assignments.

**PII**: Social Security numbers, credit card numbers (Visa/MC/Amex/Discover), email addresses, US phone numbers, IPv4 addresses.

See [DLP Patterns Reference](/reference/dlp-patterns) for the full list.

## Custom patterns

Add regex patterns for your organization's secrets:

```yaml
dlp:
  enabled: true
  mode: mask
  custom_patterns:
    - name: internal_key
      pattern: 'grwnd_[a-zA-Z0-9]{32}'
      severity: critical
      action: block # Per-pattern action override
```

Custom patterns are detected alongside built-ins and can have their own `action` override.

## Allowlist

Exclude known false positives:

```yaml
dlp:
  allowlist:
    - pattern: 'EXAMPLE_KEY_.*'
    - pattern: '127\.0\.0\.1'
```

Allowlist patterns are matched against the detected value. Other values matching the same DLP pattern are still detected.

## Masking strategies

### `partial` (default)

Shows the last N characters:

```
ghp_ABCDabcd1234 → ***1234
```

### `full`

Replaces entirely with a placeholder:

```
ghp_ABCDabcd1234 → ***
```

### `hash`

Uses a truncated SHA-256 hash for log correlation:

```
ghp_ABCDabcd1234 → [REDACTED:a1b2c3d4]
```

Configure via:

```yaml
dlp:
  masking:
    strategy: hash # partial | full | hash
    show_chars: 4 # partial only
    placeholder: '***' # partial and full only
```

## Directional control

Set different actions for inputs vs outputs:

```yaml
dlp:
  enabled: true
  mode: audit # Global default
  on_input: block # Strict on inputs sent to LLM
  on_output: mask # Redact outputs from tools
```

## Role overrides

Adjust DLP behavior per role:

```yaml
dlp:
  enabled: true
  mode: mask
  role_overrides:
    admin:
      enabled: false # Admin skips DLP entirely
    analyst:
      mode: block # Strict DLP for analysts
```

## Audit events

DLP produces three audit event types:

| Event          | When                                                |
| -------------- | --------------------------------------------------- |
| `dlp_blocked`  | Input blocked — tool call denied                    |
| `dlp_detected` | Sensitive data found — audit-only, allowed through  |
| `dlp_masked`   | Sensitive data redacted — masked in input or output |

Each event's metadata includes `patterns`, `severities`, `direction`, and `count`. Masked events also include `strategy`.

Query DLP events from your audit log:

```bash
cat ~/.pi/agent/audit.jsonl | jq 'select(.event | startswith("dlp_"))'
```
