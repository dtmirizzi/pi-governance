# Common Scenarios

Copy-paste configurations for common governance setups. Each scenario includes the YAML config and what happens when triggered.

## Lock Down a Contractor

Read-only access. Every action requires human approval.

```yaml
# governance-rules.yaml
roles:
  contractor:
    allowed_tools: [read, grep, find, ls]
    blocked_tools: [write, edit, bash]
    execution_mode: supervised
    human_approval:
      required_for: [all]
    token_budget_daily: 1000
    allowed_paths:
      - '{{project_path}}/src/**'
    blocked_paths:
      - '**/secrets/**'
      - '**/.env*'
      - '**/node_modules/**'
```

**What happens:** The contractor's agent can only read source files. Every read triggers an approval prompt. Bash, write, and edit are blocked entirely.

## Supervised Developer

Full tool access, but writes and bash need human approval.

```yaml
# governance-rules.yaml
roles:
  developer:
    allowed_tools: [read, write, edit, bash, grep, find, ls]
    blocked_tools: []
    execution_mode: supervised
    human_approval:
      required_for: [bash, write]
      auto_approve: [read, edit, grep, find, ls]
    token_budget_daily: 500000
    allowed_paths:
      - '{{project_path}}/**'
    blocked_paths:
      - '**/secrets/**'
      - '**/.env*'
```

**What happens:** Reads and edits proceed automatically. Bash commands and new file writes pause for approval. Dangerous bash is blocked outright.

## Full Autonomy for Admins

No approvals, no budget limit, full access.

```yaml
# governance-rules.yaml
roles:
  admin:
    allowed_tools: [all]
    blocked_tools: []
    execution_mode: autonomous
    human_approval:
      required_for: []
    token_budget_daily: -1
    allowed_paths: ['**']
    blocked_paths: []
```

**What happens:** All tools proceed without approval. Dangerous bash is still classified and logged, but not blocked. All actions are audited.

## Audit Everything (Compliance Mode)

Observe without executing. Log every decision.

```yaml
# governance-rules.yaml
roles:
  auditor:
    allowed_tools: [read, grep, find, ls]
    blocked_tools: [write, edit, bash]
    execution_mode: dry_run
    human_approval:
      required_for: [all]
    token_budget_daily: 50000
    allowed_paths: ['**']
    blocked_paths:
      - '**/secrets/**'
```

```yaml
# governance.yaml
audit:
  sinks:
    - type: jsonl
      path: ~/.pi/agent/audit.jsonl
    - type: webhook
      url: https://compliance.example.com/api/events
```

**What happens:** Every tool call is blocked and logged as `tool_dry_run`. The agent cannot execute anything, but you get a complete log of what it _would_ have done.

## Block All Secrets from the LLM

Maximum DLP protection for sensitive environments.

```yaml
# governance.yaml
dlp:
  enabled: true
  on_input: block
  on_output: mask
  masking:
    strategy: partial
    show_chars: 4
  severity_threshold: low
  built_in:
    secrets: true
    pii: true
```

**What happens:** Tool calls containing API keys, tokens, or credentials are blocked before execution. Tool outputs containing PII are masked (`***1234`). Audit events record what was detected.

## Custom Organization Secrets

Add patterns for your internal key formats alongside built-in detection.

```yaml
# governance.yaml
dlp:
  enabled: true
  mode: mask
  custom_patterns:
    - name: internal_api_key
      pattern: 'grwnd_[a-zA-Z0-9]{32}'
      severity: critical
      action: block
    - name: internal_service_token
      pattern: 'svc_[a-zA-Z0-9]{40}'
      severity: high
      action: mask
  allowlist:
    - pattern: 'EXAMPLE_KEY_.*'
    - pattern: '127\.0\.0\.1'
    - pattern: 'test@example\.com'
```

**What happens:** Internal API keys are blocked. Service tokens are masked. Known test values are ignored.

## Team Setup with Shared Policy

Git-committed configuration for the whole team.

```yaml
# .pi/governance.yaml (commit to git)
auth:
  provider: env

policy:
  engine: yaml
  yaml:
    rules_file: ./governance-rules.yaml

hitl:
  default_mode: supervised
  approval_channel: cli
  timeout_seconds: 300

audit:
  sinks:
    - type: jsonl
      path: ~/.pi/agent/audit.jsonl
    - type: webhook
      url: https://audit.yourcompany.com/api/v1/events

dlp:
  enabled: true
  on_input: block
  on_output: mask
  built_in:
    secrets: true
    pii: true
```

```yaml
# governance-rules.yaml (commit to git)
roles:
  analyst:
    allowed_tools: [read, grep, find, ls]
    blocked_tools: [write, edit, bash]
    execution_mode: supervised
    human_approval:
      required_for: [all]
    token_budget_daily: 100000
    allowed_paths:
      - '{{project_path}}/**'
    blocked_paths:
      - '**/secrets/**'
      - '**/.env*'

  developer:
    allowed_tools: [read, write, edit, bash, grep, find, ls]
    blocked_tools: []
    execution_mode: supervised
    human_approval:
      required_for: [bash, write]
    token_budget_daily: 500000
    allowed_paths:
      - '{{project_path}}/**'
    blocked_paths:
      - '**/secrets/**'

  admin:
    allowed_tools: [all]
    blocked_tools: []
    execution_mode: autonomous
    human_approval:
      required_for: []
    token_budget_daily: -1
    allowed_paths: ['**']
    blocked_paths: []
```

**What happens:** Every team member gets the same policy. Set `PI_RBAC_ROLE` per developer. All actions are audited to both local files and a central webhook. Config changes are auto-reloaded.
