# YAML Policies

Define governance rules using a simple YAML file.

## Basic structure

Create a `governance-rules.yaml` file:

```yaml
roles:
  analyst:
    allowed_tools: [read, grep, find, ls]
    blocked_tools: [write, edit, bash]
    prompt_template: analyst
    execution_mode: supervised
    human_approval:
      required_for: [all]
    token_budget_daily: 100000
    allowed_paths:
      - '{{project_path}}/**'
    blocked_paths:
      - '**/secrets/**'
      - '**/.env*'
```

Point your config at it:

```yaml
# .pi/governance.yaml
policy:
  engine: yaml
  yaml:
    rules_file: ./governance-rules.yaml
```

## Role fields

| Field                         | Type       | Description                                              |
| ----------------------------- | ---------- | -------------------------------------------------------- |
| `allowed_tools`               | `string[]` | Tools this role can use. Use `[all]` for unrestricted.   |
| `blocked_tools`               | `string[]` | Tools explicitly denied (overrides allowed).             |
| `prompt_template`             | `string`   | Name of the prompt template for this role.               |
| `execution_mode`              | `string`   | `autonomous`, `supervised`, or `dry_run`.                |
| `human_approval.required_for` | `string[]` | Tools requiring human approval. `[all]` for everything.  |
| `human_approval.auto_approve` | `string[]` | Tools that skip approval even in supervised mode.        |
| `token_budget_daily`          | `number`   | Max tool invocations per session. `-1` for unlimited.    |
| `allowed_paths`               | `string[]` | Glob patterns for permitted file access.                 |
| `blocked_paths`               | `string[]` | Glob patterns for denied file access (takes precedence). |
| `bash_overrides`              | `object`   | Extra safe/dangerous patterns for bash classification.   |

## Precedence rules

Two important precedence rules:

1. **`blocked_tools` takes precedence over `allowed_tools`** — if a tool is in both lists, it's blocked
2. **`blocked_paths` takes precedence over `allowed_paths`** — if a path matches both, it's denied

This means you can use `allowed_tools: [all]` and then selectively block tools, or use `allowed_paths: ['**']` and then block sensitive directories.

## Available tools

The 7 tools pi-governance manages:

| Tool    | Description             | Path checked |
| ------- | ----------------------- | ------------ |
| `bash`  | Shell command execution | No           |
| `read`  | Read a file             | Yes          |
| `write` | Create/overwrite a file | Yes (write)  |
| `edit`  | Edit a file in place    | Yes (write)  |
| `grep`  | Search file contents    | Yes          |
| `find`  | Find files by pattern   | Yes          |
| `ls`    | List directory contents | Yes          |

## Path gating

Paths use [minimatch](https://github.com/isaacs/minimatch) glob patterns. The special `{{project_path}}` variable resolves to the current working directory at runtime.

```yaml
allowed_paths:
  - '{{project_path}}/**' # Everything in the project
  - '/tmp/**' # Temp files

blocked_paths:
  - '**/secrets/**' # No secrets directory
  - '**/.env*' # No env files
  - '**/node_modules/**' # No node_modules
```

Write operations (`write`, `edit`) are checked as write access; all other tools use read access.

## Bash overrides

Add role-specific patterns to the bash classifier:

```yaml
roles:
  project_lead:
    bash_overrides:
      additional_blocked:
        - 'sudo'
        - 'ssh'
        - "curl.*\\|.*sh"
      additional_allowed:
        - 'terraform\\s+plan'
        - 'ansible\\s+--check'
```

Patterns are regular expressions. `additional_blocked` patterns are checked before `additional_allowed` (blocked takes precedence).

## Token budget

The `token_budget_daily` field sets the maximum number of tool invocations allowed per session:

```yaml
roles:
  analyst:
    token_budget_daily: 100000 # Conservative limit
  admin:
    token_budget_daily: -1 # Unlimited
```

When the budget is exhausted, all further tool calls are blocked and a `budget_exceeded` audit event is logged. Use `/governance status` to check remaining budget.

## Four standard roles

See [examples/governance-rules.yaml](https://github.com/dtmirizzi/pi-governance/blob/main/examples/governance-rules.yaml) for a complete annotated example with all four standard roles:

- **analyst** — read-only, every action approved, conservative budget
- **project_lead** — full access, bash/write approved, moderate budget
- **admin** — autonomous, unlimited budget
- **auditor** — dry-run mode, observation only
