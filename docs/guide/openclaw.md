# OpenClaw Integration

Govern what your OpenClaw agent can do — enforce tool policies, restrict MCP operations, and audit every action.

## Why a Pi extension, not an OpenClaw plugin

pi-governance is a **Pi extension**. That's the product. It works everywhere Pi runs — standalone terminal sessions, OpenClaw deployments, custom Pi-based agents, Telegram bots, Slack bots, CI pipelines. Every OpenClaw user gets governance automatically because OpenClaw runs on Pi.

An OpenClaw plugin would limit you to one deployment topology. Pi extensions compose — governance sits alongside MCP extensions, memory extensions, custom tool extensions, all on the same event bus.

The one thing a dedicated OpenClaw plugin gives you is channel-native identity — auto-detecting that a message came from `+1-555-0123` on WhatsApp or `@dtaylor` on Discord and mapping it to an RBAC role. But that's solvable within a Pi extension through environment variables, local config files, or session metadata that OpenClaw passes down to Pi.

### Architecture

```
OpenClaw gateway (WhatsApp, Discord, Telegram, …)
  └─ [optional] thin OpenClaw plugin: channel identity → env/context
      └─ Pi embedded runner
          └─ @grwnd/pi-governance extension  ← this is the product
              ├─ tool_call interception (RBAC, bash gating, MCP tools)
              ├─ prompt template selection
              ├─ audit logging
              └─ HITL approval flow
```

If you later need seamless channel-identity mapping, add a thin OpenClaw plugin that does nothing except resolve "WhatsApp number → RBAC role" and writes it into the session context. That plugin is a bridge, not the governance engine.

## How it works

OpenClaw uses Pi as its runtime. pi-governance intercepts **every tool call** — including MCP tool calls from any connected server. This means you can:

- **Allow or block specific MCP tools** per role (e.g., analysts can search but not create reports)
- **Require approval** before sensitive operations (e.g., `create_report`, `upload_asset`)
- **Audit everything** your OpenClaw agent does — structured JSON logs for every tool call
- **Set invocation budgets** to cap how much an agent session can do
- **Classify bash commands** even when the agent shells out

Every MCP tool call flows through pi-governance before Pi executes it. The tool name in your policy rules matches the MCP tool name exactly.

## Quick setup

### 1. Install

```bash
pi install npm:@grwnd/pi-governance
```

### 2. Create governance config

```yaml
# .pi/governance.yaml
auth:
  provider: env

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
```

### 3. Set identity

With environment variables (simplest):

```bash
export GRWND_USER=$(whoami)
export GRWND_ROLE=report_author
export GRWND_ORG_UNIT=engineering
```

Or with a local users file for team setups:

```yaml
# users.yaml
users:
  alice:
    role: admin
    org_unit: platform
  bob:
    role: report_author
    org_unit: engineering
  carol:
    role: analyst
    org_unit: research

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

When deploying via OpenClaw channels, set `GRWND_USER` and `GRWND_ROLE` in your OpenClaw deployment config, or map channel user IDs in the users file:

```yaml
# users.yaml — map OpenClaw channel IDs to roles
users:
  wa_alice_12345:
    role: report_author
    org_unit: engineering
  discord_bob_67890:
    role: analyst
    org_unit: research
```

### 4. Define MCP tool policies

Put MCP tool names directly in `allowed_tools` and `blocked_tools`. pi-governance matches the exact tool name from the MCP server.

```yaml
# governance-rules.yaml
roles:
  # Full access — can create reports, upload files, manage templates
  admin:
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

  # Can generate and edit reports, but not delete or manage templates
  report_author:
    allowed_tools:
      - list_reports
      - get_report
      - create_report
      - get_report_progress
      - list_report_sections
      - get_section_content
      - update_section_content
      - search_report_sections
      - search_documents
      - browse_documents
      - count_documents
      - chat_with_report
      - list_chat_threads
      - generate_asset_key
      - upload_asset
      - list_uploaded_assets
      - list_report_assets
      - get_report_attributes
      - read
      - grep
      - find
      - ls
    blocked_tools:
      - bash
      - write
      - edit
      - delete_template
    prompt_template: project_lead
    execution_mode: supervised
    human_approval:
      required_for:
        - create_report
        - upload_asset
      auto_approve:
        - list_reports
        - get_report
        - search_documents
        - read
    token_budget_daily: 500
    allowed_paths:
      - '{{project_path}}/**'
    blocked_paths:
      - '**/.env*'
      - '**/secrets/**'

  # Read-only — can search and view reports but not create or modify
  analyst:
    allowed_tools:
      - list_reports
      - get_report
      - get_report_progress
      - list_report_sections
      - get_section_content
      - search_report_sections
      - search_documents
      - browse_documents
      - count_documents
      - chat_with_report
      - list_chat_threads
      - get_report_attributes
      - list_report_assets
      - get_template
      - list_templates
      - read
      - grep
      - find
      - ls
    blocked_tools:
      - bash
      - write
      - edit
      - create_report
      - upload_asset
      - update_section_content
      - create_template
      - delete_template
    prompt_template: analyst
    execution_mode: supervised
    human_approval:
      required_for: []
      auto_approve: [all]
    token_budget_daily: 200
    allowed_paths:
      - '{{project_path}}/**'
    blocked_paths:
      - '**/.env*'
      - '**/secrets/**'
```

## MCP tool reference

These are the MCP tool names you can use in `allowed_tools` and `blocked_tools`. Use the exact names below.

### Reports

| Tool                    | Operation                | Risk  |
| ----------------------- | ------------------------ | ----- |
| `list_reports`          | List all reports         | Read  |
| `get_report`            | Get report details       | Read  |
| `create_report`         | Create a new report      | Write |
| `get_report_progress`   | Check processing status  | Read  |
| `get_report_attributes` | Get extracted attributes | Read  |

### Report sections

| Tool                     | Operation                  | Risk  |
| ------------------------ | -------------------------- | ----- |
| `list_report_sections`   | List section metadata      | Read  |
| `get_section_content`    | Read section content       | Read  |
| `update_section_content` | Edit section content       | Write |
| `search_report_sections` | Search sections by keyword | Read  |

### Documents & search

| Tool               | Operation                   | Risk |
| ------------------ | --------------------------- | ---- |
| `search_documents` | Semantic search across docs | Read |
| `browse_documents` | Paginate through doc chunks | Read |
| `count_documents`  | Count indexed chunks        | Read |

### Chat

| Tool                | Operation           | Risk |
| ------------------- | ------------------- | ---- |
| `chat_with_report`  | Chat about a report | Read |
| `list_chat_threads` | List chat threads   | Read |

### Assets

| Tool                   | Operation               | Risk  |
| ---------------------- | ----------------------- | ----- |
| `generate_asset_key`   | Generate upload key     | Write |
| `upload_asset`         | Upload a file           | Write |
| `list_uploaded_assets` | List uploaded files     | Read  |
| `list_report_assets`   | List report attachments | Read  |
| `download_asset`       | Download an asset       | Read  |

### Templates

| Tool                        | Operation                | Risk        |
| --------------------------- | ------------------------ | ----------- |
| `list_templates`            | List all templates       | Read        |
| `get_template`              | Get template details     | Read        |
| `create_template`           | Create a blank template  | Write       |
| `update_template`           | Update template metadata | Write       |
| `update_template_structure` | Modify template sections | Write       |
| `extract_template`          | AI-extract from document | Write       |
| `duplicate_template`        | Copy a template          | Write       |
| `delete_template`           | Delete a template        | Destructive |

## Audit

Every MCP tool call is logged as structured JSON. This gives you a complete record of what your OpenClaw agent did, when, and for whom.

### Example audit output

```json
{"timestamp":"2026-03-01T10:00:01Z","sessionId":"abc-123","event":"tool_allowed","userId":"alice","role":"report_author","orgUnit":"engineering","tool":"list_reports","input":{}}
{"timestamp":"2026-03-01T10:00:02Z","sessionId":"abc-123","event":"tool_allowed","userId":"alice","role":"report_author","orgUnit":"engineering","tool":"get_report","input":{}}
{"timestamp":"2026-03-01T10:00:05Z","sessionId":"abc-123","event":"approval_requested","userId":"alice","role":"report_author","orgUnit":"engineering","tool":"create_report","input":{}}
{"timestamp":"2026-03-01T10:00:08Z","sessionId":"abc-123","event":"approval_granted","userId":"alice","role":"report_author","orgUnit":"engineering","tool":"create_report","input":{},"duration":3000}
{"timestamp":"2026-03-01T10:00:12Z","sessionId":"abc-123","event":"tool_denied","userId":"alice","role":"report_author","orgUnit":"engineering","tool":"delete_template","decision":"denied","reason":"Policy denies report_author from using delete_template"}
```

### Ship audit to a central endpoint

For production deployments, send audit events to your observability stack:

```yaml
# .pi/governance.yaml
audit:
  sinks:
    - type: jsonl
      path: ~/.pi/agent/audit.jsonl
    - type: webhook
      url: ${AUDIT_WEBHOOK_URL}
```

### Query audit logs

```bash
# What did the agent create today?
cat ~/.pi/agent/audit.jsonl | jq 'select(.tool == "create_report")'

# All denied operations
cat ~/.pi/agent/audit.jsonl | jq 'select(.decision == "denied")'

# Budget usage per session
cat ~/.pi/agent/audit.jsonl | jq 'select(.event == "session_end") | .metadata.budget'
```

## Common patterns

### Approval before report creation

Require human sign-off before the agent creates reports or uploads files, but let it search and read freely:

```yaml
human_approval:
  required_for:
    - create_report
    - upload_asset
    - update_section_content
  auto_approve:
    - list_reports
    - get_report
    - search_documents
    - chat_with_report
```

### Budget-limited research session

Let the agent explore reports but cap the session:

```yaml
researcher:
  allowed_tools:
    - list_reports
    - get_report
    - search_documents
    - browse_documents
    - chat_with_report
    - read
    - grep
  blocked_tools: [bash, write, edit, create_report, upload_asset]
  execution_mode: supervised
  token_budget_daily: 100
```

After 100 tool invocations, all further calls are blocked with a `budget_exceeded` event. Monitor usage with `/governance status`.

### Observation mode

Log what the agent _would_ do without executing anything:

```yaml
observer:
  allowed_tools: [all]
  blocked_tools: []
  execution_mode: dry_run
  token_budget_daily: 1000
```

Every tool call is logged as `tool_dry_run` and blocked. Review the audit trail to understand agent behavior before granting real access.

## Channel identity bridge

The `@grwnd/openclaw-governance` plugin ([npm](https://www.npmjs.com/package/@grwnd/openclaw-governance)) bridges OpenClaw channel identity to pi-governance RBAC. When a WhatsApp, Discord, Slack, or Telegram user messages your OpenClaw agent, the plugin automatically parses the session key, looks up the user in a YAML mapping file, and sets the governance env vars — so each channel user gets the correct role without any manual configuration.

### Up and running in 3 steps

**Step 1** — Install both packages:

```bash
pi install npm:@grwnd/pi-governance
openclaw plugins install @grwnd/openclaw-governance
```

**Step 2** — Create `openclaw-users.yaml` to map channel users to roles:

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

**Step 3** — Create your governance rules (`governance-rules.yaml`) with roles that match the ones in your users file. See the [quick start](/guide/quickstart) for the full config walkthrough.

That's it. When a WhatsApp user sends a message, you'll see in the audit log:

```json
{
  "event": "session_start",
  "userId": "whatsapp:+15550123",
  "role": "report_author",
  "orgUnit": "field-ops"
}
```

### How it works

```
OpenClaw session_start
  → @grwnd/openclaw-governance plugin
    → parse sessionKey "agent:<id>:whatsapp:dm:+15550123"
    → lookup "whatsapp:+15550123" in openclaw-users.yaml
    → write process.env.GRWND_USER, GRWND_ROLE, GRWND_ORG_UNIT
  → @grwnd/pi-governance Pi extension
    → EnvIdentityProvider reads the env vars
    → governance enforced with correct role
```

### Install the plugin

```bash
openclaw plugins install @grwnd/openclaw-governance
```

### Create a users mapping file

Create `openclaw-users.yaml` alongside your OpenClaw config:

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

Keys are `<channel>:<peerId>` — the channel name and the platform-specific user identifier. Each entry maps to a governance role and optional org unit.

The `default` block is a fallback for any user not explicitly listed. Remove it to deny access to unknown users.

### Configure the plugin

In your OpenClaw config, point to the users file:

```json
{
  "plugins": {
    "grwnd-openclaw-governance": {
      "users_file": "./openclaw-users.yaml"
    }
  }
}
```

### Supported session key formats

| Format | Example                                              |
| ------ | ---------------------------------------------------- |
| DM     | `agent:<agentId>:<channel>:dm:<peerId>`              |
| Group  | `agent:<agentId>:<channel>:group:<groupId>:<peerId>` |

The plugin ignores keys it cannot parse (e.g. `agent:<id>:main` for direct operator access), leaving the env vars unset so pi-governance falls through to its next identity provider.

### Programmatic API

The plugin exports its internals for custom integrations:

```typescript
import { parseSessionKey, loadUsers, lookupUser } from '@grwnd/openclaw-governance';

// Parse a session key
const parsed = parseSessionKey('agent:abc:whatsapp:dm:+15550123');
// { agentId: 'abc', channel: 'whatsapp', chatType: 'dm', peerId: '+15550123' }

// Load and look up users
const config = loadUsers('./openclaw-users.yaml');
const user = lookupUser(config, 'whatsapp', '+15550123');
// { role: 'report_author', org_unit: 'field-ops' }
```
