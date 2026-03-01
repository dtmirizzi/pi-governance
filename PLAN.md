# pi-governance Master Plan

**Project:** `@grwnd/pi-governance`
**Repo:** [Grwnd-AI/pi-governance](https://github.com/Grwnd-AI/pi-governance)
**Started:** 2026-03-01
**License:** Apache-2.0

---

## Pre-Flight Checklist

### MCP Servers to Install

| MCP Server                | Purpose                                                  | Install                              |
| ------------------------- | -------------------------------------------------------- | ------------------------------------ |
| **context7**              | Up-to-date docs for Pi, Oso, VitePress, Typebox, Vitest  | Already available                    |
| **Grwnd**                 | Report generation for internal docs/compliance artifacts | Already available                    |
| **GitHub MCP** (optional) | Richer PR/issue management from within Claude Code       | `gh extension install github/gh-mcp` |

### Key Dependencies to Research Before Phase 0

| Dependency                      | Why                                                                                         | Action                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `@mariozechner/pi-coding-agent` | Peer dep — need to confirm extension API shape (`onBeforeToolCall`, etc.)                   | `npm view @mariozechner/pi-coding-agent` + read types |
| `oso`                           | Optional dep — confirm Apache-2.0 license, check latest API for `registerClass`/`loadFiles` | `npm view oso license`                                |
| `@sinclair/typebox`             | Config schema validation                                                                    | Stable, well-known                                    |
| `minimatch`                     | Path glob matching                                                                          | Stable                                                |
| `vitepress`                     | Docs site — need to confirm latest config format for GitHub Pages deploy                    | Use context7 to pull latest VitePress docs            |

### Branding & Assets (You Generate)

- [ ] **Logo** — primary mark for README hero, favicon, social card
- [ ] **Social card** (1200x630) — for GitHub repo + VitePress site `og:image`
- [ ] **Favicon** (32x32, 16x16, apple-touch) — for docs site
- [ ] **Color palette** — primary/accent colors for VitePress theme customization
- [ ] **Banner** — optional README header banner

> Suggestion: The logo could play on "shield + pi symbol" or "governance lock + circuit" motifs. Keep it clean — works at 32px favicon size.

---

## Phase 0: Scaffold (Target: Week 1)

### 0.1 Repository Foundation

| #      | Task                                                                               | Status | Notes                                   |
| ------ | ---------------------------------------------------------------------------------- | ------ | --------------------------------------- |
| 0.1.1  | Initialize npm package with `package.json` (name, version, pi manifest, scripts)   | `[ ]`  | Use spec's package.json as template     |
| 0.1.2  | `tsconfig.json` — strict mode, ESM + CJS output, path aliases                      | `[ ]`  | Target ES2022, moduleResolution bundler |
| 0.1.3  | `tsup` build config — dual format (ESM/CJS), DTS generation                        | `[ ]`  |                                         |
| 0.1.4  | ESLint 9 flat config + `@typescript-eslint`                                        | `[ ]`  |                                         |
| 0.1.5  | Prettier config (`.prettierrc`)                                                    | `[ ]`  |                                         |
| 0.1.6  | Vitest config (`vitest.config.ts`) + coverage with `@vitest/coverage-v8`           | `[ ]`  |                                         |
| 0.1.7  | Husky + lint-staged (pre-commit: lint + format)                                    | `[ ]`  |                                         |
| 0.1.8  | `.gitignore`, `.npmignore`, `LICENSE` (Apache-2.0)                                 | `[ ]`  |                                         |
| 0.1.9  | EditorConfig (`.editorconfig`)                                                     | `[ ]`  |                                         |
| 0.1.10 | Create full directory skeleton (empty `index.ts` files for every module in the FS) | `[ ]`  | Match FS section 5.1 structure exactly  |

### 0.2 CI/CD

| #     | Task                                                                                       | Status | Notes                                  |
| ----- | ------------------------------------------------------------------------------------------ | ------ | -------------------------------------- |
| 0.2.1 | `.github/workflows/ci.yml` — lint, typecheck, test, coverage on PR                         | `[ ]`  | Node 20.x, pnpm                        |
| 0.2.2 | `.github/workflows/docs.yml` — VitePress build + deploy to GitHub Pages on `docs/` changes | `[ ]`  |                                        |
| 0.2.3 | `.github/workflows/release.yml` — semantic-release + npm publish on main                   | `[ ]`  | Hold until Phase 4 — stub the file now |
| 0.2.4 | Enable GitHub Pages (Settings > Pages > GitHub Actions source)                             | `[ ]`  | Manual step                            |
| 0.2.5 | Branch protection on `main` — require CI pass, 1 review                                    | `[ ]`  | Manual step                            |

### 0.3 Documentation Site Scaffold

| #     | Task                                                                        | Status | Notes                 |
| ----- | --------------------------------------------------------------------------- | ------ | --------------------- |
| 0.3.1 | `docs/.vitepress/config.ts` — site title, nav, sidebar, social links, theme | `[ ]`  |                       |
| 0.3.2 | `docs/index.md` — hero landing page with logo, tagline, quick links         | `[ ]`  | Needs logo asset      |
| 0.3.3 | `docs/guide/quickstart.md` — placeholder                                    | `[ ]`  |                       |
| 0.3.4 | `docs/guide/` — create all 8 guide page stubs                               | `[ ]`  |                       |
| 0.3.5 | `docs/reference/` — create all 4 reference page stubs                       | `[ ]`  |                       |
| 0.3.6 | `docs/public/` — drop in logo, favicon, social card                         | `[ ]`  | Needs assets from you |
| 0.3.7 | Verify local `pnpm docs:dev` serves correctly                               | `[ ]`  |                       |
| 0.3.8 | Verify GitHub Pages deploy workflow works on push                           | `[ ]`  |                       |

### 0.4 README

| #     | Task                                                                                                                       | Status | Notes |
| ----- | -------------------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| 0.4.1 | Write README.md — hero banner, badges, 1-liner, features, quick install, architecture diagram (mermaid), link to docs site | `[ ]`  |       |
| 0.4.2 | Add CONTRIBUTING.md stub                                                                                                   | `[ ]`  |       |
| 0.4.3 | Add CODE_OF_CONDUCT.md                                                                                                     | `[ ]`  |       |

### Phase 0 Exit Criteria

- [ ] `pnpm install` succeeds
- [ ] `pnpm lint` passes (on empty files)
- [ ] `pnpm test` passes (empty suite)
- [ ] `pnpm build` produces `dist/` with ESM + CJS + DTS
- [ ] `pnpm docs:dev` serves VitePress locally
- [ ] CI workflow green on push to main
- [ ] Docs deploy workflow green, site accessible at `grwnd-ai.github.io/pi-governance`

---

## Phase 1: Core Engine (Target: Weeks 2-4)

> All code in `lib/` — zero Pi dependency, pure library. 100% unit testable.

### 1.1 Config System

| #     | Task                                                                                      | Status | Notes     |
| ----- | ----------------------------------------------------------------------------------------- | ------ | --------- |
| 1.1.1 | `lib/config/schema.ts` — Typebox schema (from FS section 3.2)                             | `[ ]`  |           |
| 1.1.2 | `lib/config/defaults.ts` — built-in default config                                        | `[ ]`  |           |
| 1.1.3 | `lib/config/loader.ts` — config resolution chain, env var substitution, validation        | `[ ]`  |           |
| 1.1.4 | `ConfigValidationError` with clear error messages                                         | `[ ]`  |           |
| 1.1.5 | Unit tests: valid config, invalid config, env var substitution, file precedence, defaults | `[ ]`  | ~10 tests |

### 1.2 Identity Resolution

| #     | Task                                                                            | Status | Notes     |
| ----- | ------------------------------------------------------------------------------- | ------ | --------- |
| 1.2.1 | `lib/identity/provider.ts` — `IdentityProvider` + `ResolvedIdentity` interfaces | `[ ]`  |           |
| 1.2.2 | `lib/identity/env-provider.ts` — environment variable identity                  | `[ ]`  |           |
| 1.2.3 | `lib/identity/local-provider.ts` — local YAML users file identity               | `[ ]`  |           |
| 1.2.4 | `lib/identity/chain.ts` — `IdentityChain` with fallback to most-restrictive     | `[ ]`  |           |
| 1.2.5 | Unit tests: env provider, local provider, chain ordering, fallback identity     | `[ ]`  | ~10 tests |

### 1.3 Policy Engine — YAML

| #     | Task                                                                                | Status | Notes     |
| ----- | ----------------------------------------------------------------------------------- | ------ | --------- |
| 1.3.1 | `lib/policy/engine.ts` — `PolicyEngine` interface + types                           | `[ ]`  |           |
| 1.3.2 | `lib/policy/yaml-engine.ts` — full implementation                                   | `[ ]`  |           |
| 1.3.3 | `evaluateTool()` — allowed/blocked list logic                                       | `[ ]`  |           |
| 1.3.4 | `evaluatePath()` — minimatch-based path gating with `{{project_path}}` substitution | `[ ]`  |           |
| 1.3.5 | `requiresApproval()` — approval matrix logic                                        | `[ ]`  |           |
| 1.3.6 | `getExecutionMode()`, `getTemplateName()`, `getBashOverrides()`, `getTokenBudget()` | `[ ]`  |           |
| 1.3.7 | Unit tests: all 4 roles (analyst, project_lead, admin, auditor), edge cases         | `[ ]`  | ~20 tests |

### 1.4 Policy Engine — Oso/Polar

| #     | Task                                                                        | Status | Notes     |
| ----- | --------------------------------------------------------------------------- | ------ | --------- |
| 1.4.1 | `lib/policy/oso-engine.ts` — dynamic import, Oso class registration         | `[ ]`  |           |
| 1.4.2 | `policies/base.polar` — default Polar policies (from FS section 5.4)        | `[ ]`  |           |
| 1.4.3 | `policies/tools.polar` — tool-level policies                                | `[ ]`  |           |
| 1.4.4 | `lib/policy/factory.ts` — factory to create either engine from config       | `[ ]`  |           |
| 1.4.5 | Unit tests: Oso engine with default policies, parity tests with YAML engine | `[ ]`  | ~10 tests |

### 1.5 FactStore

| #     | Task                                                       | Status | Notes    |
| ----- | ---------------------------------------------------------- | ------ | -------- |
| 1.5.1 | `lib/facts/store.ts` — `FactStore` interface               | `[ ]`  |          |
| 1.5.2 | `lib/facts/yaml-store.ts` — YAML-backed fact store         | `[ ]`  |          |
| 1.5.3 | `lib/facts/oso-memory-store.ts` — in-memory Oso fact store | `[ ]`  |          |
| 1.5.4 | Unit tests                                                 | `[ ]`  | ~5 tests |

### 1.6 Bash Command Classifier

| #     | Task                                                                                            | Status | Notes                           |
| ----- | ----------------------------------------------------------------------------------------------- | ------ | ------------------------------- |
| 1.6.1 | `lib/bash/patterns.ts` — 30+ safe patterns, 30+ dangerous patterns                              | `[ ]`  | From FS section 7.2             |
| 1.6.2 | `lib/bash/classifier.ts` — `BashClassifier` with multi-command splitting                        | `[ ]`  |                                 |
| 1.6.3 | Unit tests: 200-command test set (safe, dangerous, needs_review, multi-command, quoted strings) | `[ ]`  | ~50 tests, target 95%+ accuracy |

### 1.7 Template System

| #     | Task                                                                         | Status | Notes                |
| ----- | ---------------------------------------------------------------------------- | ------ | -------------------- |
| 1.7.1 | `lib/templates/selector.ts` — user dir > bundled dir resolution              | `[ ]`  |                      |
| 1.7.2 | `lib/templates/renderer.ts` — `{{variable}}` substitution                    | `[ ]`  |                      |
| 1.7.3 | `prompts/analyst.md`, `project-lead.md`, `admin.md`, `dry-run.md`            | `[ ]`  | From FS section 11.3 |
| 1.7.4 | Unit tests: selector resolution, renderer substitution, missing vars, arrays | `[ ]`  | ~8 tests             |

### Phase 1 Exit Criteria

- [ ] All `lib/` modules implemented and exported
- [ ] ~80 unit tests passing
- [ ] Coverage > 80% on `lib/`
- [ ] `pnpm build` produces clean dist
- [ ] Zero Pi dependency in `lib/` (no imports from Pi)
- [ ] CI green

---

## Phase 2: Pi Integration (Target: Weeks 5-7)

### 2.1 Extension Wiring

| #     | Task                                                                         | Status | Notes    |
| ----- | ---------------------------------------------------------------------------- | ------ | -------- |
| 2.1.1 | `extensions/index.ts` — main `piGovernance()` function (from FS section 4.1) | `[ ]`  |          |
| 2.1.2 | `extensions/tool-gate.ts` — `onBeforeToolCall` / `onAfterToolCall` hooks     | `[ ]`  |          |
| 2.1.3 | `extensions/session-lifecycle.ts` — `onSessionStart` / `onSessionEnd` hooks  | `[ ]`  |          |
| 2.1.4 | `summarizeParams()` helper — safe audit-friendly parameter summaries         | `[ ]`  |          |
| 2.1.5 | Integration tests with mocked `ExtensionContext`                             | `[ ]`  | ~8 tests |

### 2.2 Tool-Call Gate

| #     | Task                                                              | Status | Notes    |
| ----- | ----------------------------------------------------------------- | ------ | -------- |
| 2.2.1 | Wire `evaluateTool()` → deny blocked tools                        | `[ ]`  |          |
| 2.2.2 | Wire `BashClassifier` → deny dangerous commands                   | `[ ]`  |          |
| 2.2.3 | Wire `evaluatePath()` → deny out-of-scope file access             | `[ ]`  |          |
| 2.2.4 | Wire HITL → approval flow for `needs_approval` decisions          | `[ ]`  |          |
| 2.2.5 | Dry-run mode — block all execution, log intent                    | `[ ]`  |          |
| 2.2.6 | Denial feedback — return clear messages to the agent              | `[ ]`  |          |
| 2.2.7 | Integration tests: full gate flow (allow, deny, approve, dry-run) | `[ ]`  | ~8 tests |

### 2.3 HITL Approval

| #     | Task                                                                             | Status | Notes    |
| ----- | -------------------------------------------------------------------------------- | ------ | -------- |
| 2.3.1 | `lib/hitl/cli-approver.ts` — terminal prompt via `ctx.ui.confirm()` with timeout | `[ ]`  |          |
| 2.3.2 | `lib/hitl/webhook-approver.ts` — HTTP POST with abort controller timeout         | `[ ]`  |          |
| 2.3.3 | `lib/hitl/approval.ts` — factory function                                        | `[ ]`  |          |
| 2.3.4 | Unit tests: CLI approval, webhook approval, timeout behavior                     | `[ ]`  | ~6 tests |

### 2.4 Slash Commands

| #     | Task                                                                 | Status | Notes    |
| ----- | -------------------------------------------------------------------- | ------ | -------- |
| 2.4.1 | `extensions/commands.ts` — `/governance status` command              | `[ ]`  |          |
| 2.4.2 | `/governance setup` wizard — interactive first-run config generation | `[ ]`  |          |
| 2.4.3 | Governance skill file (`skills/governance-info/SKILL.md`)            | `[ ]`  |          |
| 2.4.4 | Integration tests for commands                                       | `[ ]`  | ~4 tests |

### 2.5 Prompt Template Injection

| #     | Task                                                    | Status | Notes |
| ----- | ------------------------------------------------------- | ------ | ----- |
| 2.5.1 | Wire template selector + renderer into `onSessionStart` | `[ ]`  |       |
| 2.5.2 | Call `ctx.setPromptTemplate()` with rendered template   | `[ ]`  |       |
| 2.5.3 | Print governance status banner on session start         | `[ ]`  |       |

### Phase 2 Exit Criteria

- [ ] End-to-end flow: install package → `pi` starts → identity resolved → policy loaded → tools gated → audit logged
- [ ] 15-20 integration tests passing against mocked Pi API
- [ ] Package installable via `pi install npm:@grwnd/pi-governance` (or local path)
- [ ] `/governance status` displays correct session info
- [ ] CI green

---

## Phase 3: Audit, Sinks, & Polish (Target: Weeks 8-9)

### 3.1 Audit System

| #     | Task                                                                         | Status | Notes               |
| ----- | ---------------------------------------------------------------------------- | ------ | ------------------- |
| 3.1.1 | `lib/audit/schema.ts` — `AuditRecord` type + `AuditEventType` union          | `[ ]`  | From FS section 9.1 |
| 3.1.2 | `lib/audit/sinks/sink.ts` — `AuditSink` interface                            | `[ ]`  |                     |
| 3.1.3 | `lib/audit/sinks/jsonl.ts` — JSONL file sink with buffered writes            | `[ ]`  |                     |
| 3.1.4 | `lib/audit/sinks/webhook.ts` — webhook sink with retry on failure            | `[ ]`  |                     |
| 3.1.5 | `lib/audit/sinks/postgres.ts` — Postgres sink (optional dep, dynamic import) | `[ ]`  |                     |
| 3.1.6 | `lib/audit/logger.ts` — multi-sink `AuditLogger`                             | `[ ]`  |                     |
| 3.1.7 | Session summary record on `onSessionEnd`                                     | `[ ]`  |                     |
| 3.1.8 | Unit tests: all sinks, multi-sink logger, buffering, flush behavior          | `[ ]`  | ~12 tests           |

### 3.2 Token Budget Enforcement (P1)

| #     | Task                                          | Status | Notes    |
| ----- | --------------------------------------------- | ------ | -------- |
| 3.2.1 | Track cumulative token usage per session      | `[ ]`  |          |
| 3.2.2 | Deny further invocations when budget exceeded | `[ ]`  |          |
| 3.2.3 | Unit tests                                    | `[ ]`  | ~3 tests |

### 3.3 Config Hot-Reload (P1)

| #     | Task                                                  | Status | Notes    |
| ----- | ----------------------------------------------------- | ------ | -------- |
| 3.3.1 | `fs.watch()` on governance YAML file                  | `[ ]`  |          |
| 3.3.2 | Reload config + policy engine without session restart | `[ ]`  |          |
| 3.3.3 | Unit tests                                            | `[ ]`  | ~2 tests |

### 3.4 Polish

| #     | Task                                                                        | Status | Notes               |
| ----- | --------------------------------------------------------------------------- | ------ | ------------------- |
| 3.4.1 | Error handling review — all thrown errors are clear and actionable          | `[ ]`  |                     |
| 3.4.2 | Performance benchmarks — `evaluateTool` < 5ms (YAML), < 10ms (Oso)          | `[ ]`  | Add as vitest bench |
| 3.4.3 | `pnpm build` output size audit — confirm tree-shakeable, Oso truly optional | `[ ]`  |                     |
| 3.4.4 | Default governance-rules.yaml + users.yaml example files in `examples/`     | `[ ]`  |                     |

### Phase 3 Exit Criteria

- [ ] Audit pipeline fully operational (JSONL default, webhook, multi-sink)
- [ ] All P0 requirements from PRD verified complete
- [ ] Token budget enforcement working
- [ ] Config hot-reload working
- [ ] ~100+ total tests, coverage > 85%
- [ ] CI green

---

## Phase 4: Documentation & Release (Target: Week 10)

### 4.1 Guide Pages (VitePress)

| #     | Task                                                                             | Status | Notes |
| ----- | -------------------------------------------------------------------------------- | ------ | ----- |
| 4.1.1 | `docs/guide/quickstart.md` — install + first governed session in < 2 min         | `[ ]`  |       |
| 4.1.2 | `docs/guide/team-deployment.md` — project-local config, git workflow             | `[ ]`  |       |
| 4.1.3 | `docs/guide/yaml-policies.md` — YAML policy authoring with worked examples       | `[ ]`  |       |
| 4.1.4 | `docs/guide/oso-policies.md` — Oso/Polar policy authoring                        | `[ ]`  |       |
| 4.1.5 | `docs/guide/bash-classifier.md` — how classification works, customizing patterns | `[ ]`  |       |
| 4.1.6 | `docs/guide/hitl.md` — HITL modes, approval flows, webhooks                      | `[ ]`  |       |
| 4.1.7 | `docs/guide/audit.md` — audit sinks, log format, querying logs                   | `[ ]`  |       |
| 4.1.8 | `docs/guide/openclaw.md` — OpenClaw integration (P1, can be shorter)             | `[ ]`  |       |

### 4.2 Reference Pages

| #     | Task                                                                                                       | Status | Notes |
| ----- | ---------------------------------------------------------------------------------------------------------- | ------ | ----- |
| 4.2.1 | `docs/reference/config.md` — full `governance.yaml` schema reference                                       | `[ ]`  |       |
| 4.2.2 | `docs/reference/api.md` — TypeScript interface docs (PolicyEngine, FactStore, IdentityProvider, AuditSink) | `[ ]`  |       |
| 4.2.3 | `docs/reference/bash-patterns.md` — full pattern list with explanations                                    | `[ ]`  |       |
| 4.2.4 | `docs/reference/audit-schema.md` — audit record field reference                                            | `[ ]`  |       |

### 4.3 Additional Docs

| #     | Task                                                                                    | Status | Notes        |
| ----- | --------------------------------------------------------------------------------------- | ------ | ------------ |
| 4.3.1 | `docs/index.md` — final hero page with logo, features grid, CTA buttons                 | `[ ]`  |              |
| 4.3.2 | Architecture overview page with Mermaid diagrams (interception flow, config resolution) | `[ ]`  |              |
| 4.3.3 | Worked examples page (4 scenarios from PRD DC-10)                                       | `[ ]`  | P1 — stretch |
| 4.3.4 | CONTRIBUTING.md — full contributor guide                                                | `[ ]`  |              |

### 4.4 Release

| #     | Task                                                        | Status | Notes |
| ----- | ----------------------------------------------------------- | ------ | ----- |
| 4.4.1 | Configure `semantic-release` + `.releaserc`                 | `[ ]`  |       |
| 4.4.2 | npm publish workflow finalized and tested                   | `[ ]`  |       |
| 4.4.3 | GitHub release with changelog                               | `[ ]`  |       |
| 4.4.4 | **v0.1.0** published to npm                                 | `[ ]`  |       |
| 4.4.5 | Verify docs site live at `grwnd-ai.github.io/pi-governance` | `[ ]`  |       |

### Phase 4 Exit Criteria

- [ ] 8 guide pages + 4 reference pages written and deployed
- [ ] Docs site live and navigable
- [ ] v0.1.0 on npm
- [ ] README badges working (CI, npm version, docs link)
- [ ] Clean GitHub release with generated changelog

---

## Post-v1.0 Backlog (Future Phases)

| Priority | Item                                      | Notes                                  |
| -------- | ----------------------------------------- | -------------------------------------- |
| P1       | OIDC/SSO identity provider (IR-5)         | Okta, Google, Auth0                    |
| P1       | OpenClaw channel identity bridge (IR-6)   | WhatsApp/Discord/Telegram user mapping |
| P1       | Prompt redaction filters (PS-4, PS-5)     | PII/client name scrubbing              |
| P1       | Data boundary enforcement for bash (TC-6) | Cross-org-unit detection               |
| P1       | Sandboxed bash execution (TC-7)           | firejail/bubblewrap/Docker             |
| P1       | Webhook approval flow (HI-5)              | Slack bot integration                  |
| P1       | Escalation notifications (HI-6)           | Slack/email alerts                     |
| P1       | `/governance audit` command (DX-7)        | View recent audit entries              |
| P1       | `/governance test` command (DX-8)         | Policy dry-run/what-if                 |
| P2       | Cost ceiling enforcement (PE-13)          | Per-invocation + daily                 |
| P2       | Policy dry-run CLI (PE-14)                | For policy authoring                   |
| P2       | Postgres FactStore                        | Centralized fact sync                  |
| P2       | Oso Cloud FactStore                       | SaaS policy sync                       |
| P2       | Agent-to-agent governance                 | Sub-agent policy propagation           |
| P2       | Policy analytics dashboard                | Web UI for audit visualization         |

---

## Tech Stack Summary

| Layer             | Choice                 | Rationale                            |
| ----------------- | ---------------------- | ------------------------------------ |
| Language          | TypeScript (strict)    | Pi ecosystem is TS                   |
| Build             | tsup                   | Fast, dual ESM/CJS, DTS              |
| Test              | Vitest                 | Fast, native TS, coverage            |
| Lint              | ESLint 9 (flat config) | Standard                             |
| Format            | Prettier               | Standard                             |
| Schema Validation | @sinclair/typebox      | Zero-dep, compile-time types         |
| Path Matching     | minimatch              | De facto standard                    |
| Authz (optional)  | oso (Polar)            | Declarative, relational, Apache-2.0  |
| Config Format     | YAML                   | Human-readable, git-friendly         |
| Docs              | VitePress              | Fast, Vue-based, GitHub Pages native |
| CI/CD             | GitHub Actions         | Repo-native                          |
| Release           | semantic-release       | Conventional commits → semver        |
| Package Manager   | pnpm                   | Fast, strict, workspace-ready        |

---

## Open Decisions

| #   | Question                        | Options                                                                                  | Decision                                             |
| --- | ------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 1   | Package manager                 | pnpm vs bun                                                                              | **pnpm** (wider CI support, Pi ecosystem standard)   |
| 2   | Pi extension API confirmation   | Need to verify actual types vs FS assumptions                                            | Research in Phase 0                                  |
| 3   | Oso version compatibility       | `oso@^0.27.0` — need to test with latest                                                 | Research in Phase 0                                  |
| 4   | Bash classifier default posture | Opinionated (block network tools for non-admin) vs conservative (only block destructive) | Per PRD open question #4 — **recommend opinionated** |
| 5   | Monorepo structure?             | Single package vs monorepo (package + docs + examples)                                   | **Single package** — simpler for v0.1                |
