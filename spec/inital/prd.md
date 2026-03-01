# Product Requirements Document: `@grwnd/pi-governance`

## Governance, RBAC, Audit, and Human-in-the-Loop for Pi-based Coding Agents

**Version:** 1.0  
**Author:** Grwnd AI  
**Date:** March 1, 2026  
**Status:** Draft — Ready for Engineering Planning

---

## 1. Executive Summary

`@grwnd/pi-governance` is an open-source Pi Package that provides enterprise-grade governance for AI coding agents built on the Pi framework (the agent runtime that powers OpenClaw and custom Pi-based agents). It delivers role-based access control, prompt-level policy enforcement, tool-call interception, bash command classification, human-in-the-loop approval workflows, and comprehensive audit logging — all without modifying Pi or OpenClaw internals.

The package is distributed as a standard npm Pi Package. Users install it alongside Pi, not instead of it. It hooks into Pi's native extension lifecycle events to enforce policy at the agent-loop level, making it effective everywhere Pi runs: standalone CLI, embedded in OpenClaw (WhatsApp/Telegram/Discord/Web), custom SDK-based agents, and CI pipelines.

### 1.1 Why This Exists

Grwnd AI is a roll-up company acquiring environmental consulting firms and standardizing operations across acquisitions using AI-powered workforce enablement. Each acquisition brings distinct teams, data boundaries, compliance requirements, and varying levels of AI maturity. There is no existing open-source solution that provides governance for agentic coding tools without vendor lock-in.

The broader market need: any organization deploying Pi, OpenClaw, Claude Code, or similar agentic tools in production needs governance controls that are decoupled from the agent runtime itself. This package addresses that gap.

### 1.2 Strategic Context

- **Primary user:** Grwnd AI internal deployments across acquired environmental consulting firms (Cornerstone AEC, IDEM, ERM, and future acquisitions)
- **Secondary user:** Open-source Pi/OpenClaw community — teams deploying agentic coding tools that need governance without building it from scratch
- **Future wedge:** If traction materializes, the project opens a path toward an open-source alternative to Oso Cloud's centralized policy sync layer

---

## 2. Problem Statement

### 2.1 Core Problems

1. **No RBAC for agent tool use.** Pi provides four tools (read, write, edit, bash) with no built-in mechanism to restrict which users can invoke which tools, or to scope tool access by organizational unit. Any user with access to the agent has full access to all tools.

2. **Bash is god-mode.** The `bash` tool can execute arbitrary commands — `curl`, `rm -rf`, `ssh`, `sudo`, package installation, network access. There is no classification, filtering, or sandboxing of bash commands by default.

3. **No prompt-level policy enforcement.** The system prompt that constrains agent behavior is the same for all users. There is no mechanism to select different system prompts based on the user's role, restrict the agent's self-perceived capabilities per role, or enforce data boundary awareness.

4. **No audit trail.** There is no record of who invoked the agent, what tools were used, what commands were executed, what was approved or denied, or what the cost/token usage was. This makes compliance, incident investigation, and due diligence impossible.

5. **No human-in-the-loop controls.** There is no mechanism to require human approval before the agent executes certain tool calls, no dry-run mode for observation without execution, and no escalation path when the agent hits a policy boundary.

6. **No multi-tenant data isolation.** In a roll-up model with multiple acquired firms, there is no mechanism to prevent users at one acquisition from accessing data belonging to another acquisition through the agent.

### 2.2 Constraints

- **Must not fork or patch Pi.** The governance layer must work through Pi's public extension API. It must remain independently installable and upgradeable.
- **Must not fork or patch OpenClaw.** When used inside OpenClaw, the governance layer integrates through Pi's extension mechanism (loaded by OpenClaw's embedded Pi runner), not through OpenClaw gateway plugins.
- **Must work offline.** The YAML policy engine and local Oso (Polar) engine must function without network access. Cloud-based fact sync is optional/future.
- **Must be zero-config viable.** A developer should be able to `pi install npm:@grwnd/pi-governance` and get basic tool gating with sensible defaults before configuring anything.

---

## 3. User Personas

### 3.1 Org Admin (Grwnd central IT / acquisition integration lead)

- Defines roles, policies, and org-unit scoping
- Configures governance rules per acquisition
- Reviews audit logs for compliance
- Sets human-in-the-loop thresholds
- Needs: policy-as-code (version-controlled), bulk deployment, visibility across all acquisitions

### 3.2 Project Lead (senior engineer/manager at an acquired firm)

- Uses the agent daily for project work
- Can read and write files within their project scope
- Needs some autonomy but with guardrails on destructive operations
- Needs: minimal friction, clear feedback when hitting boundaries, ability to request escalation

### 3.3 Analyst (junior staff at an acquired firm)

- Uses the agent for read-heavy tasks: searching code, reading docs, getting suggestions
- Cannot execute writes or bash commands directly
- Every action may require approval (especially during onboarding)
- Needs: clear indication of what they can/cannot do, smooth approval flow

### 3.4 Open-Source Developer (external community)

- Installs pi-governance for their own team
- Starts with YAML config, may adopt Oso for complex setups
- Needs: excellent docs, easy install, sensible defaults, clear extension points

### 3.5 Auditor (compliance/security reviewer)

- Does not use the agent directly
- Reviews audit logs to verify policy compliance
- Needs: complete, tamper-resistant audit records with full context

---

## 4. Product Requirements

### 4.1 Policy Engine (Dual-Engine Architecture)

**P0 — Must Have**

| ID   | Requirement                      | Detail                                                                                                                                                                                                                                                                |
| ---- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| PE-1 | YAML policy engine               | A zero-dependency policy engine that reads governance rules from a YAML configuration file. Supports role definitions, tool allowlists/blocklists, bash command patterns, path-level write permissions, and human-in-the-loop thresholds.                             |
| PE-2 | Oso/Polar policy engine          | A policy engine that uses the open-source Oso library and Polar language for declarative authorization. Supports relational policies, role inheritance, org-unit scoping, and attribute-based access control.                                                         |
| PE-3 | Pluggable PolicyEngine interface | Both engines implement the same `PolicyEngine` interface. Config selects which engine is active: `policy.engine: yaml` or `policy.engine: oso`.                                                                                                                       |
| PE-4 | Pluggable FactStore interface    | Role assignments, org-unit memberships, and relationships are stored in a `FactStore` abstraction. Implementations: `YamlFactStore` (reads from config file), `OsoMemoryFactStore` (loads into local Oso instance). Future: `PostgresFactStore`, `OsoCloudFactStore`. |
| PE-5 | Role primitives                  | Roles (e.g., `analyst`, `project_lead`, `admin`, `auditor`), org-unit scoping (e.g., `cornerstone_aec`, `idem`), and the ability for a user to have different roles in different org units.                                                                           |
| PE-6 | Tool permission evaluation       | `evaluateTool(user, tool, params) → allow                                                                                                                                                                                                                             | deny                                                                                    | needs_approval`                                                                                    |
| PE-7 | Bash command classification      | `evaluateBash(user, command) → safe                                                                                                                                                                                                                                   | dangerous                                                                               | needs_review` using regex pattern matching against allowlists/blocklists, with per-role overrides. |
| PE-8 | Path permission evaluation       | `evaluatePath(user, operation, path) → allow                                                                                                                                                                                                                          | deny` for file read/write/edit operations, with per-role and per-org-unit path scoping. |
| PE-9 | Config validation                | Typebox or Zod schema validation of the governance config file at load time, with clear error messages for invalid configuration.                                                                                                                                     |

**P1 — Should Have**

| ID    | Requirement                   | Detail                                                                                                                                           |
| ----- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| PE-10 | Token budget enforcement      | Per-role daily token budget. The extension tracks cumulative token usage per session and denies further invocations when the budget is exceeded. |
| PE-11 | Hot-reload of config          | When the governance YAML file changes on disk, the extension reloads without restarting the Pi session.                                          |
| PE-12 | Per-org-unit policy overrides | Org-unit-specific YAML files or Polar files that override base policies for specific acquisitions.                                               |

**P2 — Nice to Have**

| ID    | Requirement                   | Detail                                                                                                                                           |
| ----- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| PE-13 | Cost ceiling enforcement      | Per-invocation and per-day cost ceilings based on estimated API costs.                                                                           |
| PE-14 | Policy dry-run / what-if mode | A CLI command that evaluates a hypothetical tool call against the current policy without executing anything, for policy authoring and debugging. |

### 4.2 Identity Resolution

**P0 — Must Have**

| ID   | Requirement                          | Detail                                                                                                                           |
| ---- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| IR-1 | Environment variable identity        | Resolve user identity from `GRWND_USER` and `GRWND_ROLE` environment variables. Simplest integration path.                       |
| IR-2 | Local users file                     | Resolve identity from a local YAML users file (`users.yaml`) mapping usernames to roles and org-units.                           |
| IR-3 | Pluggable IdentityProvider interface | Both resolution methods implement the same interface. Config selects which provider is active.                                   |
| IR-4 | Fallback identity                    | If no identity can be resolved, the extension applies a configurable default role (default: most restrictive role, or deny all). |

**P1 — Should Have**

| ID   | Requirement                      | Detail                                                                                                                                                                            |
| ---- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IR-5 | OIDC / SSO identity              | Resolve identity from an OIDC token (Okta, Google, Auth0). The extension reads a token from a configurable location and validates it.                                             |
| IR-6 | OpenClaw channel identity bridge | When running inside OpenClaw, extract the sender's channel identity (WhatsApp number, Discord user ID, Telegram handle) from Pi's session context and map it to an RBAC identity. |

### 4.3 Prompt-Level Shim

**P0 — Must Have**

| ID   | Requirement                    | Detail                                                                                                                                                                                                                                          |
| ---- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PS-1 | Role-scoped prompt templates   | Ship 3-4 prompt template markdown files (analyst, project-lead, admin, dry-run) that constrain the agent's self-perceived capabilities based on the resolved role. The extension selects and injects the appropriate template at session start. |
| PS-2 | Template variable substitution | Templates support variables like `{{org_unit}}`, `{{allowed_paths}}`, `{{project_path}}`, `{{role_name}}` that are resolved from the session context and governance config.                                                                     |
| PS-3 | User-overridable templates     | Users can provide their own template files in a configurable directory. The extension uses user templates if present, falling back to bundled defaults.                                                                                         |

**P1 — Should Have**

| ID   | Requirement             | Detail                                                                                                                                                                                                          |
| ---- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PS-4 | Prompt redaction filter | Before the user's message reaches the model, scan for and redact sensitive patterns (PII, client names that shouldn't cross acquisition boundaries, regulated terms). Configurable regex patterns per org-unit. |
| PS-5 | Output redaction filter | On the response side, scan model output for sensitive content before it's displayed to the user.                                                                                                                |

### 4.4 Tool Call Interception

**P0 — Must Have**

| ID   | Requirement                      | Detail                                                                                                                                                                                                                                                                                               |
| ---- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-1 | Pre-execution gate for all tools | Every tool call (read, write, edit, bash) passes through the policy engine before execution. Denied calls are blocked and logged.                                                                                                                                                                    |
| TC-2 | Bash command classification      | Parse bash command strings against configurable allowlist/blocklist regex patterns. Minimum 30 patterns covering: read-only commands (ls, cat, grep, find, git status, etc.), dangerous commands (rm -rf, sudo, chmod, curl\|sh, dd, etc.), and a `needs_review` fallback for unclassified commands. |
| TC-3 | Path-level write gating          | For write and edit tool calls, verify the target file path is within the user's permitted paths (per role and per org-unit).                                                                                                                                                                         |
| TC-4 | Denial feedback                  | When a tool call is denied, the extension returns a clear message to the agent explaining what was denied and why, and suggesting the user request escalation if they believe the action is necessary.                                                                                               |
| TC-5 | Post-execution audit hook        | After every tool call completes, log the tool name, parameters (summarized, not full file contents), result status, and latency.                                                                                                                                                                     |

**P1 — Should Have**

| ID   | Requirement               | Detail                                                                                                                                                                          |
| ---- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-6 | Data boundary enforcement | For bash and read commands, detect if the command or path references data outside the user's org-unit boundary and deny/flag.                                                   |
| TC-7 | Sandboxed bash execution  | For stricter environments, optionally rewrite bash commands to run inside a sandbox (firejail, bubblewrap, or Docker). The model doesn't see the sandboxing — it's transparent. |

### 4.5 Human-in-the-Loop (HITL)

**P0 — Must Have**

| ID   | Requirement                  | Detail                                                                                                                                                                                                                                     |
| ---- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| HI-1 | Per-role approval matrix     | Configurable matrix specifying which tool calls require human approval, which auto-approve, and which are outright denied, per role.                                                                                                       |
| HI-2 | CLI approval flow            | When a tool call requires approval (Pi standalone), prompt the user in the terminal with a clear description of what the agent wants to do, and wait for explicit yes/no. Use Pi's `ctx.ui.confirm()` if available, or fall back to stdin. |
| HI-3 | Configurable execution modes | Three modes selectable per role and per org-unit: `autonomous` (no approval needed), `supervised` (approval per configured matrix), `dry_run` (agent plans but nothing executes — everything queued for review).                           |
| HI-4 | Approval timeout             | If human approval is not received within a configurable timeout (default: 300 seconds), deny the action and log it.                                                                                                                        |

**P1 — Should Have**

| ID   | Requirement             | Detail                                                                                                                                                                 |
| ---- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HI-5 | Webhook approval flow   | Send approval requests to a configurable webhook URL (for Slack bots, custom approval UIs, etc.) and wait for a response.                                              |
| HI-6 | Escalation notification | When an action is denied due to policy, optionally send a notification to a configurable channel (Slack webhook, email) informing an admin that a user hit a boundary. |

### 4.6 Audit Logging

**P0 — Must Have**

| ID   | Requirement                      | Detail                                                                                                                                                                                                                                                                             |
| ---- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AL-1 | Append-only structured audit log | Every governance decision (allow, deny, approval_requested, approval_granted, approval_denied, session_start, session_end) is logged as a structured JSON record.                                                                                                                  |
| AL-2 | JSONL file sink                  | Default audit sink that writes to a local `.jsonl` file. Append-only (the logger never reads or modifies existing records).                                                                                                                                                        |
| AL-3 | Audit record schema              | Each record includes: `timestamp`, `event_type`, `user_id`, `role`, `org_unit`, `tool` (if applicable), `tool_params_summary` (not full file contents), `policy_decision`, `policy_reason`, `approval_status` (if HITL), `session_id`, `token_usage` (if available), `latency_ms`. |
| AL-4 | Session summary record           | At session end, emit a summary record with total tool calls, total denials, total approvals, cumulative token usage, and session duration.                                                                                                                                         |

**P1 — Should Have**

| ID   | Requirement           | Detail                                                                                               |
| ---- | --------------------- | ---------------------------------------------------------------------------------------------------- |
| AL-5 | Webhook audit sink    | Send audit records to a configurable webhook URL for integration with external logging systems.      |
| AL-6 | PostgreSQL audit sink | Write audit records to a Postgres table with INSERT-only permissions.                                |
| AL-7 | Multi-sink support    | Configure multiple audit sinks simultaneously (e.g., JSONL locally + webhook to centralized system). |

### 4.7 Developer Experience & Commands

**P0 — Must Have**

| ID   | Requirement                  | Detail                                                                                                                                                                                                         |
| ---- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DX-1 | Pi Package installation      | Install via `pi install npm:@grwnd/pi-governance`. Package manifest exposes extensions, skills, and prompt templates following Pi's package convention.                                                        |
| DX-2 | `/governance status` command | A slash command within Pi that displays: current user, resolved role, org unit, active policy engine, execution mode, tool call stats for current session, and number of denials.                              |
| DX-3 | `/governance setup` wizard   | First-run interactive setup: identity provider selection, username, org unit, role, audit log path. Writes config to `~/.pi/agent/governance.yaml` or `.pi/governance.yaml`.                                   |
| DX-4 | Project-local config         | Support `.pi/governance.yaml` in the project directory (committed to git) for team-wide governance. Pi auto-installs the package and loads config when teammates run `pi` in the directory.                    |
| DX-5 | Zero-config defaults         | If no config file exists and no setup is run, apply sensible defaults: all tools allowed, bash classification active (dangerous commands denied), JSONL audit to `~/.pi/agent/audit.jsonl`, `supervised` mode. |
| DX-6 | Governance skill             | A Pi Skill file (`governance-info/SKILL.md`) that the agent can read to understand its own governance constraints, so it can explain to users why an action was denied.                                        |

**P1 — Should Have**

| ID   | Requirement                 | Detail                                                                                            |
| ---- | --------------------------- | ------------------------------------------------------------------------------------------------- |
| DX-7 | `/governance audit` command | Display recent audit log entries in the terminal, filterable by event type.                       |
| DX-8 | `/governance test` command  | Run a policy dry-run: "Would tool X with params Y be allowed for user Z?" — for policy authoring. |

### 4.8 Documentation Site

**P0 — Must Have**

| ID   | Requirement                         | Detail                                                                                                                                          |
| ---- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| DC-1 | GitHub Pages site                   | Static documentation site built with VitePress, deployed automatically via GitHub Actions on pushes to `docs/`.                                 |
| DC-2 | Quick Start guide                   | Installation and first-run for Pi standalone (1 user, 1 command).                                                                               |
| DC-3 | Team Deployment guide               | Project-local config, git workflow, onboarding teammates.                                                                                       |
| DC-4 | Configuration reference             | Complete reference for `governance.yaml` schema with every field documented.                                                                    |
| DC-5 | Policy authoring guides             | Separate guides for YAML policy engine and Oso/Polar policy engine, with worked examples.                                                       |
| DC-6 | Architecture overview               | Diagram and explanation of the interception flow: identity → policy → prompt shim → tool gate → audit.                                          |
| DC-7 | Bash classifier reference           | Full list of default allowlist/blocklist patterns with explanations.                                                                            |
| DC-8 | API / Extension interface reference | TypeScript interface documentation for PolicyEngine, FactStore, IdentityProvider, AuditSink — for contributors building custom implementations. |

**P1 — Should Have**

| ID    | Requirement                | Detail                                                                                                            |
| ----- | -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| DC-9  | OpenClaw integration guide | How to use pi-governance when Pi is embedded inside OpenClaw.                                                     |
| DC-10 | Worked examples            | 4 example scenarios: solo developer lockdown, multi-team rollup, CI pipeline governance, custom approval webhook. |
| DC-11 | Contributing guide         | How to contribute policy patterns, audit sinks, identity providers.                                               |

---

## 5. Architecture Overview

### 5.1 Package Structure

```
@grwnd/pi-governance/
├── package.json                      # Pi package manifest + npm metadata
├── tsconfig.json
├── vitest.config.ts
├── extensions/
│   ├── index.ts                      # Extension entrypoint (registers all hooks)
│   ├── tool-gate.ts                  # onBeforeToolCall / onAfterToolCall
│   ├── session-lifecycle.ts          # onSessionStart / onSessionEnd
│   └── commands.ts                   # /governance slash commands
├── prompts/
│   ├── analyst.md                    # Restricted prompt template
│   ├── project-lead.md               # Standard prompt template
│   ├── admin.md                      # Full-access prompt template
│   └── dry-run.md                    # Observation-only prompt template
├── skills/
│   └── governance-info/
│       └── SKILL.md                  # Agent-readable governance explanation
├── lib/
│   ├── config/
│   │   ├── schema.ts                 # Typebox config schema + validation
│   │   ├── loader.ts                 # Load + validate config from YAML
│   │   └── defaults.ts               # Default config values
│   ├── policy/
│   │   ├── engine.ts                 # PolicyEngine interface definition
│   │   ├── yaml-engine.ts            # YAML-based implementation
│   │   ├── oso-engine.ts             # Oso/Polar-based implementation
│   │   └── factory.ts                # Factory: config → engine instance
│   ├── facts/
│   │   ├── store.ts                  # FactStore interface definition
│   │   ├── yaml-store.ts             # YAML file-backed fact store
│   │   └── oso-memory-store.ts       # In-memory Oso fact store
│   ├── identity/
│   │   ├── provider.ts               # IdentityProvider interface
│   │   ├── env-provider.ts           # Environment variable identity
│   │   ├── local-provider.ts         # Local users.yaml identity
│   │   └── chain.ts                  # Try providers in order
│   ├── bash/
│   │   ├── classifier.ts             # Bash command classification
│   │   └── patterns.ts               # Default regex patterns
│   ├── audit/
│   │   ├── logger.ts                 # AuditLogger class
│   │   ├── sinks/
│   │   │   ├── sink.ts               # AuditSink interface
│   │   │   ├── jsonl.ts              # JSONL file sink
│   │   │   ├── webhook.ts            # Webhook sink
│   │   │   └── postgres.ts           # Postgres sink
│   │   └── schema.ts                 # Audit record schema
│   ├── hitl/
│   │   ├── approval.ts               # Approval flow orchestration
│   │   ├── cli-approver.ts           # Terminal approval prompt
│   │   └── webhook-approver.ts       # Webhook-based approval
│   └── templates/
│       ├── renderer.ts               # Template variable substitution
│       └── selector.ts               # Role → template selection
├── policies/
│   ├── base.polar                    # Default Oso/Polar policies
│   └── tools.polar                   # Tool-level Polar policies
├── docs/                             # VitePress documentation site
│   ├── .vitepress/config.ts
│   ├── index.md
│   ├── guide/
│   │   ├── quickstart.md
│   │   ├── team-deployment.md
│   │   ├── yaml-policies.md
│   │   ├── oso-policies.md
│   │   ├── bash-classifier.md
│   │   ├── hitl.md
│   │   ├── audit.md
│   │   └── openclaw.md
│   └── reference/
│       ├── config.md
│       ├── api.md
│       ├── bash-patterns.md
│       └── audit-schema.md
├── test/
│   ├── unit/
│   │   ├── config/
│   │   ├── policy/
│   │   ├── bash/
│   │   ├── identity/
│   │   ├── audit/
│   │   └── templates/
│   └── integration/
│       ├── tool-gate.test.ts
│       ├── session-lifecycle.test.ts
│       └── commands.test.ts
└── .github/
    └── workflows/
        ├── ci.yml                    # Lint → test → coverage on PR
        ├── release.yml               # semantic-release → npm publish on main
        └── docs.yml                  # VitePress → GitHub Pages on docs/ changes
```

### 5.2 Interception Flow

```
User message
    │
    ▼
┌─────────────────────────────┐
│  Pi Agent Runtime            │
│                              │
│  ┌────────────────────────┐  │
│  │ onSessionStart         │  │  ← Identity resolution
│  │  → resolve identity    │  │  ← Role/org-unit lookup
│  │  → load policy engine  │  │  ← Select prompt template
│  │  → inject prompt shim  │  │  ← Start audit session
│  └────────────────────────┘  │
│            │                 │
│            ▼                 │
│  ┌────────────────────────┐  │
│  │ Model generates         │  │
│  │ tool_call request       │  │
│  └────────────────────────┘  │
│            │                 │
│            ▼                 │
│  ┌────────────────────────┐  │
│  │ onBeforeToolCall        │  │  ← RBAC: is tool allowed?
│  │  → evaluateTool()      │  │  ← Bash: classify command
│  │  → evaluatePath()      │  │  ← HITL: needs approval?
│  │  → audit.log(decision) │  │  ← Block or proceed
│  └────────────────────────┘  │
│            │                 │
│     ┌──────┴──────┐         │
│     │ allow       │ deny    │
│     ▼             ▼         │
│  Execute       Return       │
│  tool          denial msg   │
│     │                       │
│     ▼                       │
│  ┌────────────────────────┐  │
│  │ onAfterToolCall         │  │  ← Audit: log result
│  │  → audit.log(result)   │  │  ← Optional: redact output
│  └────────────────────────┘  │
│            │                 │
│            ▼                 │
│  ┌────────────────────────┐  │
│  │ onSessionEnd            │  │  ← Emit session summary
│  │  → audit.flush()       │  │  ← Report token usage
│  └────────────────────────┘  │
└─────────────────────────────┘
```

### 5.3 Decoupling Strategy

| Dimension          | Approach                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pi core updates    | Package declares `peerDependencies` on Pi version range. CI runs contract tests against Pi's extension API on each release. Version compatibility matrix in README. |
| OpenClaw updates   | No direct dependency on OpenClaw. Governance loads as a Pi extension inside OpenClaw's embedded Pi runner.                                                          |
| Config changes     | Config lives in user's `.pi/` directory or `~/.pi/agent/`, not inside the package. Package ships defaults that can be overridden.                                   |
| Policy updates     | Policy files (YAML or Polar) are user-owned and version-controlled separately from the package.                                                                     |
| Audit sink changes | Audit sinks are pluggable. Adding a new sink doesn't require updating the core package.                                                                             |

---

## 6. Phasing Plan

### Phase 0: Scaffold (Week 1)

- Repository setup: TypeScript, Vitest, ESLint, Prettier, Husky pre-commit hooks
- Empty Pi Package skeleton with correct `package.json` manifest
- VitePress scaffold with placeholder pages
- GitHub Actions: `ci.yml` (lint + test), `docs.yml` (VitePress build + deploy)
- All CI green on empty test suite

### Phase 1: Core Engine (Weeks 2–4)

- Config schema (Typebox) + validation + loader
- YAML policy engine — full PolicyEngine interface implementation
- Oso/Polar policy engine — full PolicyEngine interface implementation, loaded via dynamic import so `oso` is an optional dependency
- FactStore interface + YamlFactStore + OsoMemoryFactStore
- IdentityProvider interface + env provider + local file provider + identity chain
- Bash command classifier with 30+ regex patterns (read-only, dangerous, needs-review)
- Template renderer with variable substitution
- ~80 unit tests across all lib/ modules, zero Pi dependency (all pure library code)
- Deliverable: all `lib/` code complete and tested, no Pi wiring yet

### Phase 2: Pi Integration (Weeks 5–7)

- Pi extension entrypoint: `onSessionStart`, `onBeforeToolCall`, `onAfterToolCall`, `onSessionEnd`
- Tool-call gate wired to PolicyEngine
- Prompt template selection and injection wired to session lifecycle
- `/governance status` and `/governance setup` slash commands
- HITL approval flow: CLI approver via terminal prompt
- Dry-run execution mode
- Governance skill file
- 15–20 integration tests against mocked Pi ExtensionAPI
- Deliverable: installable Pi Package, end-to-end governance flow working

### Phase 3: Audit, Sinks, & Polish (Weeks 8–9)

- Audit logger with multi-sink support
- JSONL sink (default), webhook sink, Postgres sink
- Audit record schema validation
- Session summary records
- Token budget enforcement
- Config hot-reload
- Deliverable: production-ready audit pipeline, all P0 requirements complete

### Phase 4: Documentation & Release (Week 10)

- VitePress documentation site: 8 guide pages, 4 reference pages
- Quick start guide, team deployment guide, policy authoring guides
- Architecture overview with diagrams
- Bash classifier reference
- API/interface reference
- `semantic-release` configuration + npm publish workflow
- v0.1.0 release to npm
- Deliverable: published package + documentation site on GitHub Pages

---

## 7. Success Metrics

| Metric                       | Target                                                           | Measurement                       |
| ---------------------------- | ---------------------------------------------------------------- | --------------------------------- |
| Installation success         | `pi install` works with zero errors on Pi ≥ 0.50.0               | CI contract tests                 |
| Policy evaluation latency    | < 5ms per tool call (YAML), < 10ms (Oso)                         | Benchmarks in test suite          |
| Bash classification accuracy | ≥ 95% correct classification on curated test set of 200 commands | Unit tests                        |
| Audit completeness           | 100% of tool calls produce an audit record                       | Integration tests                 |
| Zero-config time-to-value    | < 2 minutes from `pi install` to first governed session          | Manual testing / docs walkthrough |
| Documentation coverage       | Every public interface, config field, and pattern documented     | Doc review checklist              |

---

## 8. Risks & Mitigations

| Risk                                            | Impact                                                              | Mitigation                                                                                                                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pi extension API changes                        | Governance extension breaks on Pi update                            | Pin peerDependency range. Run CI against Pi nightly. Maintain version compat matrix.                                                                                       |
| Bash classifier bypass                          | Model chains/encodes commands to evade regex patterns               | Defense in depth: classifier is one layer. Prompt template constrains model intent. Path-level checks catch file access. Sandbox mode (P1) for high-security environments. |
| Oso library size                                | Increases install size for users who don't need relational policies | Oso is an optional dependency loaded via dynamic import. YAML engine is zero-dependency.                                                                                   |
| Identity resolution in headless/CI environments | No interactive user to resolve identity from                        | Environment variable provider works in CI. Default role (configurable) for unresolved identity.                                                                            |
| Performance overhead                            | Policy evaluation adds latency to every tool call                   | Benchmark target: < 5ms. Policy is evaluated in-process (no network). Oso's Polar engine is designed for sub-millisecond evaluation.                                       |

---

## 9. Future Considerations (Post v1.0)

- **Open-source centralized fact store**: Postgres/SQLite-backed FactStore with a `reconcile` CLI for bulk sync, mirroring Oso Cloud's sync pattern without the SaaS dependency
- **OpenClaw gateway plugin**: Thin plugin that bridges channel identity (WhatsApp number, Discord user ID) into Pi session context for the governance extension to consume
- **Agent-to-agent governance**: When Pi orchestrates sub-agents, propagate governance context and enforce policies on delegated tool calls
- **Policy analytics dashboard**: Web UI that visualizes audit logs — tool usage by role, denial rates, approval latency, cost per team
- **Fine-grained bash sandboxing**: Per-command resource limits (CPU, memory, network, filesystem) using cgroups or seccomp profiles
- **OIDC/SSO identity provider**: First-class support for enterprise identity providers (Okta, Google Workspace, Azure AD)

---

## 10. Open Questions

1. **Pi extension API stability**: What is Pi's commitment to backward compatibility for the extension lifecycle hooks (`onBeforeToolCall`, etc.)? Should we pin to specific Pi versions or track latest?
2. **OpenClaw's embedded Pi extension loading**: Does OpenClaw's embedded runner support loading third-party Pi packages installed globally, or only packages in its own source tree? May require a small contribution to OpenClaw.
3. **Oso licensing**: Oso's open-source core uses Apache 2.0. Confirm this is compatible with our planned license (likely MIT or Apache 2.0).
4. **Bash classifier scope**: Should the default classifier patterns be opinionated (block `curl`, `wget`, network tools by default for non-admin roles) or conservative (only block clearly destructive commands)?

---

## Appendix A: Default Governance Config

```yaml
# governance.yaml — default configuration
# This file is auto-generated by /governance setup

claude_code_path: auto

auth:
  provider: env # env | local | oidc
  env:
    user_var: GRWND_USER
    role_var: GRWND_ROLE
    org_unit_var: GRWND_ORG_UNIT
  local:
    users_file: ./users.yaml

policy:
  engine: yaml # yaml | oso
  yaml:
    rules_file: ./governance-rules.yaml
  oso:
    polar_files:
      - ./policies/base.polar
      - ./policies/tools.polar

templates:
  directory: ./templates/
  default: project-lead

hitl:
  default_mode: supervised # autonomous | supervised | dry_run
  approval_channel: cli # cli | webhook
  timeout_seconds: 300
  webhook:
    url: ${GOVERNANCE_WEBHOOK_URL}

audit:
  sinks:
    - type: jsonl
      path: ~/.pi/agent/audit.jsonl
    # - type: webhook
    #   url: ${AUDIT_WEBHOOK_URL}
    # - type: postgres
    #   connection: ${AUDIT_DB_URL}

org_units:
  default:
    hitl:
      default_mode: supervised
    # Per-org overrides:
    # cornerstone_aec:
    #   hitl:
    #     default_mode: dry_run
    #   policy:
    #     extra_polar: ./policies/cornerstone_overrides.polar
```

## Appendix B: Default Governance Rules (YAML Engine)

```yaml
# governance-rules.yaml — role definitions for YAML policy engine

roles:
  analyst:
    allowed_tools: [read]
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

  project_lead:
    allowed_tools: [read, write, edit, bash]
    blocked_tools: []
    prompt_template: project-lead
    execution_mode: supervised
    human_approval:
      required_for: [bash, write]
      auto_approve: [read, edit]
    token_budget_daily: 500000
    allowed_paths:
      - '{{project_path}}/**'
    blocked_paths:
      - '**/secrets/**'
      - '**/.env*'
    bash_overrides:
      additional_blocked:
        - 'sudo'
        - 'ssh'
        - "curl.*\\|.*sh"

  admin:
    allowed_tools: [all]
    blocked_tools: []
    prompt_template: admin
    execution_mode: autonomous
    human_approval:
      required_for: []
    token_budget_daily: -1 # unlimited
    allowed_paths: ['**']
    blocked_paths: []

  auditor:
    allowed_tools: [read]
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
