# @grwnd/openclaw-governance

[![npm](https://img.shields.io/npm/v/@grwnd/openclaw-governance)](https://www.npmjs.com/package/@grwnd/openclaw-governance)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](../../LICENSE)

OpenClaw identity bridge plugin for [@grwnd/pi-governance](https://github.com/Grwnd-AI/pi-governance).

Parses OpenClaw session keys (WhatsApp, Discord, Slack, Telegram) and maps channel users to governance roles — so pi-governance enforces the right RBAC policy per user without any manual env var setup.

## How it works

```
OpenClaw session_start
  → @grwnd/openclaw-governance plugin
    → parse sessionKey "agent:<id>:whatsapp:dm:+15550123"
    → lookup "whatsapp:+15550123" in openclaw-users.yaml
    → write process.env.PI_RBAC_USER, PI_RBAC_ROLE, PI_RBAC_ORG_UNIT
  → @grwnd/pi-governance Pi extension
    → EnvIdentityProvider reads the env vars
    → governance enforced with correct role
```

## Quick start

### 1. Install both packages

```bash
# Install the governance Pi extension
pi install npm:@grwnd/pi-governance

# Install the OpenClaw identity bridge plugin
openclaw plugins install @grwnd/openclaw-governance
```

### 2. Create a users mapping file

Create `openclaw-users.yaml` alongside your OpenClaw config:

```yaml
users:
  # WhatsApp — key by phone number
  whatsapp:+15550123:
    role: report_author
    org_unit: field-ops

  # Discord — key by user ID
  discord:428374928374:
    role: analyst

  # Slack — key by member ID
  slack:U04ABCD1234:
    role: project_lead
    org_unit: engineering

# Fallback for unknown users (remove to deny access)
default:
  role: analyst
  org_unit: default
```

Keys are `<channel>:<peerId>` — the channel name and the platform-specific user identifier.

### 3. Configure the plugin

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

If `users_file` is omitted, it defaults to `./openclaw-users.yaml` in the current working directory.

### 4. Set up governance rules

Create your pi-governance config and rules as normal — see the [pi-governance docs](https://grwnd-ai.github.io/pi-governance/guide/quickstart). The roles you assign in `openclaw-users.yaml` must match roles defined in `governance-rules.yaml`.

### 5. Verify

When a WhatsApp user sends a message to your OpenClaw agent, you'll see in the audit log:

```json
{
  "event": "session_start",
  "userId": "whatsapp:+15550123",
  "role": "report_author",
  "orgUnit": "field-ops"
}
```

## Session key formats

| Format | Example                                              |
| ------ | ---------------------------------------------------- |
| DM     | `agent:<agentId>:<channel>:dm:<peerId>`              |
| Group  | `agent:<agentId>:<channel>:group:<groupId>:<peerId>` |

The plugin ignores keys it cannot parse (e.g. `agent:<id>:main` for direct operator access), leaving the env vars unset so pi-governance falls through to its next identity provider.

## API

The plugin exports its internals for programmatic use:

```typescript
import { parseSessionKey, loadUsers, lookupUser } from '@grwnd/openclaw-governance';

const parsed = parseSessionKey('agent:abc:whatsapp:dm:+15550123');
// { agentId: 'abc', channel: 'whatsapp', chatType: 'dm', peerId: '+15550123' }

const config = loadUsers('./openclaw-users.yaml');
const user = lookupUser(config, 'whatsapp', '+15550123');
// { role: 'report_author', org_unit: 'field-ops' }
```

## License

[Apache-2.0](../../LICENSE)
