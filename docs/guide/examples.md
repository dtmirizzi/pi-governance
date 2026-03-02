# Worked Examples

Four common governance scenarios with complete configurations.

## 1. Solo developer with safety rails

You want dangerous bash commands blocked and a local audit trail, but no approval prompts.

```yaml
# .pi/governance.yaml
auth:
  provider: env

policy:
  engine: yaml
  yaml:
    rules_file: ./governance-rules.yaml

hitl:
  default_mode: autonomous

audit:
  sinks:
    - type: jsonl
      path: ~/.pi/agent/audit.jsonl
```

```yaml
# governance-rules.yaml
roles:
  developer:
    allowed_tools: [all]
    blocked_tools: []
    prompt_template: admin
    execution_mode: autonomous
    human_approval:
      required_for: []
    token_budget_daily: -1
    allowed_paths: ['**']
    blocked_paths:
      - '**/.env*'
      - '**/secrets/**'
```

```bash
export PI_RBAC_USER=$(whoami)
export PI_RBAC_ROLE=developer
export PI_RBAC_ORG_UNIT=default
pi
```

**Result:** All tools available, dangerous bash blocked by default classifier, no approval prompts, full audit trail.

## 2. Team with tiered access

A 4-person team where the lead has full access and juniors are read-only.

```yaml
# users.yaml
users:
  alice:
    role: admin
    org_unit: platform
  bob:
    role: project_lead
    org_unit: backend
  carol:
    role: analyst
    org_unit: backend
  dave:
    role: analyst
    org_unit: frontend

default:
  role: analyst
  org_unit: default
```

```yaml
# .pi/governance.yaml
auth:
  provider: local
  local:
    users_file: ./users.yaml

policy:
  engine: yaml
  yaml:
    rules_file: ./governance-rules.yaml

hitl:
  default_mode: supervised
  timeout_seconds: 120

audit:
  sinks:
    - type: jsonl
      path: ~/.pi/agent/audit.jsonl
    - type: webhook
      url: ${TEAM_AUDIT_URL}
```

Use the [standard four roles](https://github.com/Grwnd-AI/pi-governance/blob/main/examples/governance-rules.yaml) in `governance-rules.yaml`.

**Result:** Alice can do anything. Bob gets approval prompts for bash/write. Carol and Dave can only read.

## 3. Compliance audit mode

Run an agent in observation mode to log what it _would_ do without executing anything.

```yaml
# governance-rules.yaml
roles:
  auditor:
    allowed_tools: [read, grep, find, ls]
    blocked_tools: [write, edit, bash]
    prompt_template: analyst
    execution_mode: dry_run
    human_approval:
      required_for: [all]
    token_budget_daily: 50000
    allowed_paths: ['**']
    blocked_paths:
      - '**/secrets/**'
```

```bash
export PI_RBAC_ROLE=auditor
pi
```

**Result:** Every tool call is logged as `tool_dry_run` and blocked. The audit trail shows exactly what the agent attempted. Useful for reviewing agent behavior before granting real access.

## 4. Budget-limited research session

Allow an analyst to explore a codebase but cap the session at 100 tool invocations.

```yaml
# governance-rules.yaml
roles:
  researcher:
    allowed_tools: [read, grep, find, ls]
    blocked_tools: [write, edit, bash]
    prompt_template: analyst
    execution_mode: supervised
    human_approval:
      required_for: []
      auto_approve: [read, grep, find, ls]
    token_budget_daily: 100
    allowed_paths:
      - '{{project_path}}/**'
    blocked_paths:
      - '**/secrets/**'
      - '**/.env*'
      - '**/node_modules/**'
```

```bash
export PI_RBAC_ROLE=researcher
pi
```

**Result:** The agent can read, search, and list files without approval. After 100 tool invocations, all further calls are blocked with a `budget_exceeded` event. Use `/governance status` to monitor budget usage.
