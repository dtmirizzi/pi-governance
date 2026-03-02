# Team Deployment

Deploy governance across your team using project-local configuration and git.

## Overview

The deployment model is simple: commit your governance config to git, and every teammate who installs the extension automatically inherits the same policy.

1. Add `.pi/governance.yaml` and `governance-rules.yaml` to your project root
2. Commit both files to git
3. Each teammate runs `pi install npm:@grwnd/pi-governance`
4. Pi auto-loads the config when teammates start a session in the project directory

## Project structure

```
my-project/
  .pi/
    governance.yaml       # Main config (auth, policy, hitl, audit)
  governance-rules.yaml   # Role definitions
  users.yaml              # Optional: local identity mappings
```

## Identity strategies

### Environment variables (default)

Each teammate sets their identity before starting Pi:

```bash
export PI_RBAC_USER=$(whoami)
export PI_RBAC_ROLE=project_lead
export PI_RBAC_ORG_UNIT=backend
```

This works well when roles are managed externally (e.g., CI/CD pipelines, team scripts).

### Local users file

For teams that want identity managed in git, use a local users file:

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
    org_unit: data-science

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
```

The provider matches the current OS username (`whoami`) against the users file. Unrecognized users fall back to the `default` entry, or to `analyst` if no default is set.

## Role design for teams

A typical team setup uses 3-4 roles:

| Role           | Who                          | Mode       | Tools               |
| -------------- | ---------------------------- | ---------- | ------------------- |
| `admin`        | Tech leads, DevOps           | autonomous | All                 |
| `project_lead` | Senior engineers             | supervised | All (bash approved) |
| `analyst`      | Junior engineers, reviewers  | supervised | Read-only           |
| `auditor`      | Compliance, security reviews | dry_run    | Read-only (logged)  |

## Org-unit overrides

Override HITL or policy settings for specific organizational units:

```yaml
# .pi/governance.yaml
org_units:
  compliance:
    hitl:
      default_mode: dry_run
  platform:
    hitl:
      timeout_seconds: 600
```

## Config hot-reload

When a teammate updates `governance.yaml` or `governance-rules.yaml` and saves the file, running sessions automatically detect the change and reload the policy engine and bash classifier. No session restart needed.

The reload is debounced (500ms) and validated — if the new config is invalid, the current config is kept and a warning is displayed. A `config_reloaded` audit event is logged on successful reload.

## Shared audit

Configure a shared audit sink so all team activity is captured centrally:

```yaml
audit:
  sinks:
    - type: jsonl
      path: ~/.pi/agent/audit.jsonl # Local copy per user
    - type: webhook
      url: ${AUDIT_WEBHOOK_URL} # Central collection
```

Each audit record includes `userId`, `role`, and `orgUnit`, making it easy to filter by team member or department.

## Git workflow tips

1. **Review policy changes in PRs** — treat `governance-rules.yaml` like infrastructure code
2. **Use environment variables for secrets** — webhook URLs, database connections use `${VAR}` syntax
3. **Pin roles to the minimum required** — start with `analyst` and escalate only as needed
4. **Test with dry_run first** — validate a policy change in dry-run mode before enforcing it
5. **Use token budgets** — set `token_budget_daily` to limit runaway sessions
