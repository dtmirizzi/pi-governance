# Quick Start

## Install (30 seconds)

```bash
pi install npm:@grwnd/pi-governance
```

Start a session — governance is active immediately:

```bash
pi
```

Verify:

```
/governance status
```

### What you get out of the box

| Protection          | Default                                                 |
| ------------------- | ------------------------------------------------------- |
| Bash classification | Active — dangerous commands blocked                     |
| DLP                 | Active — secrets blocked on input, PII masked on output |
| Role                | `analyst` (read-only) unless `PI_RBAC_ROLE` is set      |
| Audit               | JSONL to `~/.pi/agent/audit.jsonl`                      |

## Customize

### Option A: Interactive wizard

```
/governance init
```

Opens a browser-based configuration wizard. Select roles, toggle DLP, configure audit sinks — generates YAML files for you.

### Option B: Manual YAML

Create `.pi/governance.yaml` in your project root:

```yaml
auth:
  provider: env
policy:
  engine: yaml
  yaml:
    rules_file: ./governance-rules.yaml
hitl:
  default_mode: supervised
audit:
  sinks:
    - type: jsonl
      path: ~/.pi/agent/audit.jsonl
```

### Set your identity

```bash
export PI_RBAC_USER=alice
export PI_RBAC_ROLE=project_lead
export PI_RBAC_ORG_UNIT=default
pi
```

If no identity is set, the extension falls back to `analyst` (most restrictive).

## Next steps

- [Why Governance?](./why.md) — Concrete scenarios showing what can go wrong
- [Common Scenarios](./scenarios.md) — Copy-paste configs for common setups
- [YAML Policies](./yaml-policies.md) — Full policy reference
- [Team Deployment](./team-deployment.md) — Roll out to your team
