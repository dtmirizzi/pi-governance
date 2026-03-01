<p align="center">
  <img src="assets/logo.png" alt="pi-governance logo" width="180" />
</p>

<h1 align="center">@grwnd/pi-governance</h1>

<p align="center">
  Governance, RBAC, audit, and human-in-the-loop for Pi-based coding agents.
</p>

<p align="center">
  <a href="https://github.com/Grwnd-AI/pi-governance/actions/workflows/ci.yml"><img src="https://github.com/Grwnd-AI/pi-governance/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://www.npmjs.com/package/@grwnd/pi-governance"><img src="https://img.shields.io/npm/v/@grwnd/pi-governance" alt="npm pi-governance" /></a>
  <a href="https://www.npmjs.com/package/@grwnd/openclaw-governance"><img src="https://img.shields.io/npm/v/@grwnd/openclaw-governance?label=openclaw-governance" alt="npm openclaw-governance" /></a>
  <a href="https://github.com/Grwnd-AI/pi-governance/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License" /></a>
  <a href="https://grwnd-ai.github.io/pi-governance/"><img src="https://img.shields.io/badge/docs-GitHub%20Pages-blue" alt="Docs" /></a>
</p>

---

## What is this?

`pi-governance` is a Pi extension that intercepts every tool call your AI coding agent makes and enforces policy before execution. It provides:

- **Role-based access control** — define who can use which tools
- **Bash command classification** — auto-block dangerous commands (`rm -rf`, `sudo`, `curl | sh`)
- **Path-level file gating** — restrict read/write to scoped directories
- **Data loss prevention** — detect and block/mask API keys, tokens, and PII before they reach the LLM
- **Human-in-the-loop approval** — require sign-off for sensitive operations
- **Audit logging** — structured JSONL logs of every governance decision
- **Prompt-level policy** — role-scoped system prompt templates

It works as a drop-in shim. Install it, and your existing Pi agent gains governance controls without any code changes.

## Quick Start

### Install

```bash
pi install npm:@grwnd/pi-governance
```

That's it. On next session start, governance is active with sensible defaults:

- All tools allowed
- Dangerous bash commands blocked
- Supervised mode (approval required for writes and bash)
- DLP disabled (opt-in)
- Audit logged to `~/.pi/agent/audit.jsonl`

### Configure

Create `.pi/governance.yaml` in your project root (committed to git for team-wide policy):

```yaml
auth:
  provider: env

policy:
  engine: yaml
  yaml:
    rules_file: ./governance-rules.yaml

hitl:
  default_mode: supervised
  timeout_seconds: 300

audit:
  sinks:
    - type: jsonl
      path: ~/.pi/agent/audit.jsonl
```

### Define Roles

Create `governance-rules.yaml`:

```yaml
roles:
  analyst:
    allowed_tools: [read]
    blocked_tools: [write, edit, bash]
    execution_mode: supervised
    human_approval:
      required_for: [all]
    allowed_paths:
      - '{{project_path}}/**'
    blocked_paths:
      - '**/secrets/**'
      - '**/.env*'

  project_lead:
    allowed_tools: [read, write, edit, bash]
    blocked_tools: []
    execution_mode: supervised
    human_approval:
      required_for: [bash, write]
      auto_approve: [read, edit]
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
    allowed_paths: ['**']
    blocked_paths: []
```

### Set Identity

Set environment variables before starting your Pi session:

```bash
export GRWND_USER=alice
export GRWND_ROLE=project_lead
export GRWND_ORG_UNIT=cornerstone_aec

pi
```

Or use a local users file for team setups — see the [docs](https://grwnd-ai.github.io/pi-governance/).

### Check Status

Inside a governed Pi session:

```
/governance status
```

```
Governance active
  User:      alice
  Role:      project_lead
  Org Unit:  cornerstone_aec
  Engine:    yaml
  Mode:      supervised
  Session:   3 tool calls, 0 denials
```

## Architecture

```
User message → Pi Agent Runtime
                    │
              ┌─────┴──────┐
              │ onSessionStart │  ← Identity resolution
              │  → load policy │  ← Select prompt template
              └─────┬──────┘
                    │
              ┌─────┴──────────┐
              │ onBeforeToolCall │  ← RBAC: tool allowed?
              │  → classify bash │  ← Path check
              │  → DLP scan      │  ← Block/mask secrets & PII
              │  → HITL approval │  ← Audit log
              └─────┬──────────┘
                    │
               allow │ deny
                    │    └→ Return denial message
                    │
              ┌─────┴──────────┐
              │ onAfterToolCall  │  ← DLP scan output
              │                  │  ← Audit result
              └────────────────┘
```

## Data Loss Prevention

DLP prevents secrets and PII from leaking through tool calls to LLM providers. It scans both inputs (before execution) and outputs (before reaching the LLM).

```yaml
dlp:
  enabled: true
  mode: mask # audit | mask | block
  on_input: block # block tool calls with secrets
  on_output: mask # redact secrets in tool output
  masking:
    strategy: partial # partial | full | hash
    show_chars: 4
  severity_threshold: low
  built_in:
    secrets: true # AWS keys, GitHub PATs, JWTs, Stripe keys, ...
    pii: true # SSN, credit cards, email, phone, IP
  custom_patterns:
    - name: internal_key
      pattern: 'grwnd_[a-zA-Z0-9]{32}'
      severity: critical
      action: block
  allowlist:
    - pattern: '127\.0\.0\.1'
  role_overrides:
    admin:
      enabled: false # admin skips DLP
```

DLP is **disabled by default** — zero behavioral change for existing users. See the full [DLP guide](https://grwnd-ai.github.io/pi-governance/guide/dlp) and [pattern reference](https://grwnd-ai.github.io/pi-governance/reference/dlp-patterns).

## Dual Policy Engine

Choose between two policy engines:

| Engine             | Best for                                       | Dependency       |
| ------------------ | ---------------------------------------------- | ---------------- |
| **YAML** (default) | Simple setups, quick start                     | Zero — built-in  |
| **Oso/Polar**      | Complex RBAC, relational policies, inheritance | `oso` (optional) |

Switch engines in config:

```yaml
policy:
  engine: oso
  oso:
    polar_files:
      - ./policies/base.polar
      - ./policies/tools.polar
```

## OpenClaw

pi-governance works with [OpenClaw](https://github.com/Grwnd-AI) out of the box. OpenClaw runs on Pi, so installing pi-governance as a Pi extension automatically governs every tool call your OpenClaw agent makes — including MCP tools.

```
OpenClaw gateway (WhatsApp, Discord, Telegram, …)
  └─ [optional] @grwnd/openclaw-governance plugin → channel identity
      └─ Pi embedded runner
          └─ @grwnd/pi-governance extension
              ├─ RBAC for MCP tools (create_report, upload_asset, …)
              ├─ bash command classification
              ├─ audit logging (JSONL + webhook)
              └─ HITL approval flow
```

### Get up and running

```bash
# 1. Install the Pi governance extension
pi install npm:@grwnd/pi-governance

# 2. Install the OpenClaw identity bridge plugin
openclaw plugins install @grwnd/openclaw-governance
```

Create `openclaw-users.yaml` to map channel users to governance roles:

```yaml
users:
  whatsapp:+15550123:
    role: report_author
    org_unit: field-ops
  discord:428374928374:
    role: analyst
  slack:U04ABCD1234:
    role: project_lead
    org_unit: engineering
default:
  role: analyst
  org_unit: default
```

Put MCP tool names directly in your policy rules:

```yaml
# governance-rules.yaml
roles:
  report_author:
    allowed_tools:
      - list_reports
      - get_report
      - create_report
      - search_documents
      - chat_with_report
      - read
      - grep
    blocked_tools: [bash, write, edit, delete_template]
    execution_mode: supervised
    human_approval:
      required_for: [create_report, upload_asset]
      auto_approve: [list_reports, get_report, search_documents]
    token_budget_daily: 500
```

When a WhatsApp user messages your OpenClaw agent, the identity bridge parses the session key, maps them to a role, and pi-governance enforces the policy — all automatically. Every MCP tool call is audited as structured JSON.

See the full [OpenClaw integration guide](https://grwnd-ai.github.io/pi-governance/guide/openclaw) for MCP tool reference tables, channel identity mapping, and common patterns.

## Documentation

Full documentation at **[grwnd-ai.github.io/pi-governance](https://grwnd-ai.github.io/pi-governance/)**.

- [Quick Start](https://grwnd-ai.github.io/pi-governance/guide/quickstart)
- [Team Deployment](https://grwnd-ai.github.io/pi-governance/guide/team-deployment)
- [OpenClaw Integration](https://grwnd-ai.github.io/pi-governance/guide/openclaw)
- [YAML Policies](https://grwnd-ai.github.io/pi-governance/guide/yaml-policies)
- [Bash Classifier](https://grwnd-ai.github.io/pi-governance/guide/bash-classifier)
- [Data Loss Prevention](https://grwnd-ai.github.io/pi-governance/guide/dlp)
- [Configuration Reference](https://grwnd-ai.github.io/pi-governance/reference/config)

## License

[Apache-2.0](LICENSE)
