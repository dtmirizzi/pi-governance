# Audit Schema Reference

Structure of audit log records.

## Record fields

Every audit record contains these base fields:

| Field       | Type     | Description               |
| ----------- | -------- | ------------------------- |
| `id`        | `string` | UUID v4 unique identifier |
| `timestamp` | `string` | ISO 8601 timestamp        |
| `sessionId` | `string` | Pi session identifier     |
| `event`     | `string` | Event type (see below)    |
| `userId`    | `string` | Resolved user identity    |
| `role`      | `string` | User's active role        |
| `orgUnit`   | `string` | User's org unit           |

## Optional fields

These fields are present on tool-related events:

| Field      | Type     | Description                                             |
| ---------- | -------- | ------------------------------------------------------- |
| `tool`     | `string` | Tool name (`bash`, `read`, `write`, `edit`, etc.)       |
| `input`    | `object` | Summarized parameters (commands truncated to 100 chars) |
| `decision` | `string` | `allowed` or `denied`                                   |
| `reason`   | `string` | Why the decision was made (denial events)               |
| `duration` | `number` | Approval duration in milliseconds (HITL events)         |
| `metadata` | `object` | Extra data (varies by event type)                       |

## Event types

### session_start

Logged when a governed session begins.

| Metadata field  | Type     | Description                    |
| --------------- | -------- | ------------------------------ |
| `source`        | `string` | Config file path or `built-in` |
| `executionMode` | `string` | Role's execution mode          |

### session_end

Logged when a session ends. Contains aggregated session statistics.

| Metadata field         | Type     | Description                         |
| ---------------------- | -------- | ----------------------------------- |
| `stats.allowed`        | `number` | Total allowed tool calls            |
| `stats.denied`         | `number` | Total denied tool calls             |
| `stats.approvals`      | `number` | Total HITL approval prompts         |
| `stats.dryRun`         | `number` | Total dry-run blocks                |
| `stats.budgetExceeded` | `number` | Total budget exceeded blocks        |
| `budget.used`          | `number` | Tool invocations consumed           |
| `budget.remaining`     | `number` | Remaining invocations (or Infinity) |
| `summary`              | `object` | Event type counts for the session   |

### tool_allowed

Logged when a tool call passes all governance checks.

### tool_denied

Logged when a tool call is blocked by policy (not in allowed_tools or in blocked_tools).

### tool_dry_run

Logged when a tool call is blocked by dry-run mode.

### bash_denied

Logged when a bash command is classified as dangerous and blocked.

### path_denied

Logged when a file tool targets a path outside allowed boundaries or inside blocked paths.

### approval_requested

Logged when an HITL approval prompt is shown to the user or sent to a webhook.

### approval_granted

Logged when a human approves a tool call. Includes `duration` (time to approve in ms).

### approval_denied

Logged when a human denies a tool call or the approval times out. Includes `reason` and `duration`.

### budget_exceeded

Logged when a tool call is blocked because the session's tool invocation budget is exhausted.

### config_reloaded

Logged when the governance config file is successfully hot-reloaded during a session.

| Metadata field | Type     | Description      |
| -------------- | -------- | ---------------- |
| `source`       | `string` | Config file path |

### dlp_blocked

Logged when a tool call is blocked because sensitive data was detected in the input.

| Metadata field | Type       | Description                   |
| -------------- | ---------- | ----------------------------- |
| `patterns`     | `string[]` | Names of matched DLP patterns |
| `severities`   | `string[]` | Severity levels of matches    |
| `direction`    | `string`   | `input`                       |
| `count`        | `number`   | Total number of matches       |

### dlp_detected

Logged when sensitive data is found but allowed through (audit-only mode).

| Metadata field | Type       | Description                   |
| -------------- | ---------- | ----------------------------- |
| `patterns`     | `string[]` | Names of matched DLP patterns |
| `severities`   | `string[]` | Severity levels of matches    |
| `direction`    | `string`   | `input` or `output`           |
| `count`        | `number`   | Total number of matches       |

### dlp_masked

Logged when sensitive data is redacted in tool input or output.

| Metadata field | Type       | Description                                     |
| -------------- | ---------- | ----------------------------------------------- |
| `patterns`     | `string[]` | Names of matched DLP patterns                   |
| `severities`   | `string[]` | Severity levels of matches                      |
| `direction`    | `string`   | `input` or `output`                             |
| `count`        | `number`   | Total number of matches                         |
| `strategy`     | `string`   | Masking strategy used (`partial`/`full`/`hash`) |

## Example records

### tool_allowed

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-03-01T14:30:00.000Z",
  "event": "tool_allowed",
  "sessionId": "sess_abc123",
  "userId": "alice",
  "role": "project_lead",
  "orgUnit": "backend",
  "tool": "bash",
  "input": { "command": "git status" },
  "decision": "allowed"
}
```

### budget_exceeded

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "timestamp": "2026-03-01T15:45:00.000Z",
  "event": "budget_exceeded",
  "sessionId": "sess_abc123",
  "userId": "carol",
  "role": "analyst",
  "orgUnit": "data-science",
  "tool": "read",
  "input": { "path": "/project/src/index.ts" },
  "decision": "denied",
  "reason": "Budget exhausted (100000 invocations used)"
}
```

### session_end

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "timestamp": "2026-03-01T16:00:00.000Z",
  "event": "session_end",
  "sessionId": "sess_abc123",
  "userId": "alice",
  "role": "project_lead",
  "orgUnit": "backend",
  "metadata": {
    "stats": { "allowed": 42, "denied": 3, "approvals": 5, "dryRun": 0, "budgetExceeded": 0 },
    "budget": { "used": 50, "remaining": 499950 },
    "summary": {
      "tool_allowed": 42,
      "tool_denied": 2,
      "bash_denied": 1,
      "approval_requested": 5,
      "approval_granted": 5
    }
  }
}
```
