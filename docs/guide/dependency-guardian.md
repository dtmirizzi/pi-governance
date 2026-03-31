# Dependency Guardian

pi-governance's Dependency Guardian validates package-install commands before they execute, protecting against slopsquatting, typosquatting, and supply-chain attacks.

## Why Dependency Guardian matters

AI coding agents hallucinate package names ~20% of the time. Attackers register those names on npm and PyPI with malicious code — a technique called **slopsquatting**. When an agent runs `npm install expresss` (note the typo), it installs an attacker-controlled package that can exfiltrate secrets, inject backdoors, or pivot laterally.

Dependency Guardian intercepts install commands (`npm install`, `pip install`, `cargo add`, etc.) and validates every package before execution.

::: tip Interactive Setup
Use `/governance init` to configure Dependency Guardian through a browser-based wizard — no YAML editing required.
:::

## Quick setup

Add a `dependency_guardian` section to your `governance.yaml`:

```yaml
dependency_guardian:
  enabled: true
```

Dependency Guardian is **disabled by default** — existing users are unaffected.

## How it works

When a bash tool call is classified as dangerous and contains an install command, Dependency Guardian:

1. **Parses** the command to extract package names, versions, and flags
2. **Skips** lockfile installs (`npm ci`, `--frozen-lockfile`) and custom registries
3. **Fetches** registry metadata (age, downloads, maintainers, install scripts)
4. **Queries** [OSV.dev](https://osv.dev) for known vulnerabilities
5. **Checks** against allow/blocklists and typosquat detection
6. **Scores** each package and recommends: allow, escalate, or block

## Supported package managers

| Manager | Ecosystem | Install commands detected         |
| ------- | --------- | --------------------------------- |
| npm     | npm       | `npm install`, `npm i`, `npm add` |
| yarn    | npm       | `yarn add`, `yarn install`        |
| pnpm    | npm       | `pnpm add`, `pnpm install`        |
| pip     | PyPI      | `pip install`                     |
| cargo   | crates.io | `cargo add`, `cargo install`      |

## Configuration

### Full example

```yaml
dependency_guardian:
  enabled: true
  checks:
    existence: true # Verify the package exists on the registry
    reputation: true # Check age, download count, maintainer count
    typosquatting: true # Detect names similar to popular packages
    install_scripts: true # Flag packages with install scripts
    vulnerabilities: true # Query OSV.dev for known CVEs
  risk_thresholds:
    min_age_days: 30 # Packages newer than this trigger a signal
    min_weekly_downloads: 100 # Downloads below this trigger a signal
  on_risk: escalate # What to do when risk is detected
  custom_registry_bypass: true # Skip checks for private registries
  allowlist:
    - my-internal-pkg
  blocklist:
    - known-bad-pkg
  blocklist_patterns:
    - '^evil-'
```

### Risk modes (`on_risk`)

#### `escalate` (default)

Risky packages trigger a human-in-the-loop confirmation prompt. The user sees a summary of all risk signals and can approve or deny the install.

```yaml
dependency_guardian:
  enabled: true
  on_risk: escalate
```

#### `block`

Any package with medium or higher risk is blocked outright. No human prompt — the install command is denied.

```yaml
dependency_guardian:
  enabled: true
  on_risk: block
```

#### `audit`

All risk signals are logged but installs proceed without interruption. Useful for monitoring before enforcing.

```yaml
dependency_guardian:
  enabled: true
  on_risk: audit
```

### Checks

Toggle individual checks:

```yaml
dependency_guardian:
  enabled: true
  checks:
    existence: true # Is the package on the registry?
    reputation: false # Skip age/download checks
    typosquatting: true # Detect name similarity to popular packages
    install_scripts: true # Flag preinstall/postinstall scripts
    vulnerabilities: true # Query OSV.dev
```

### Custom registry bypass

Private/internal registries are trusted by default. When `custom_registry_bypass: true` (the default), commands using `--registry`, `--index-url`, or `--extra-index-url` skip all checks.

```yaml
dependency_guardian:
  custom_registry_bypass: true # default
```

Set to `false` to validate packages from private registries too.

### Allow and blocklists

Built-in allowlists cover ~75 popular npm packages and ~50 popular PyPI packages. Allowlisted packages skip reputation checks but still get vulnerability scanning.

```yaml
dependency_guardian:
  allowlist:
    - my-org-utils # Trusted internal package
    - company-cli
  blocklist:
    - known-malware # Exact name match
  blocklist_patterns:
    - '-crack$' # Regex patterns
    - '-keygen$'
```

## Risk signals

| Signal                | Severity | Trigger                                            |
| --------------------- | -------- | -------------------------------------------------- |
| `package_not_found`   | critical | Package does not exist on the registry             |
| `on_blocklist`        | critical | Package matches the blocklist                      |
| `known_vulnerability` | varies   | OSV.dev reports a CVE (severity from CVSS score)   |
| `very_new_package`    | high     | Created less than 7 days ago                       |
| `typosquat_suspect`   | high     | Name is 1-2 edits from a popular package           |
| `low_downloads`       | high/med | Weekly downloads below threshold (< 10 = high)     |
| `has_install_scripts` | medium   | Package has preinstall/install/postinstall scripts |
| `new_package`         | medium   | Created less than `min_age_days` ago               |
| `no_repository`       | low      | No source repository URL in metadata               |
| `no_readme`           | low      | No README content                                  |
| `no_license`          | low      | No license declared                                |
| `single_maintainer`   | info     | Only one maintainer                                |

## Decision logic

| Overall risk | Recommendation |
| ------------ | -------------- |
| critical     | **block**      |
| high/medium  | **escalate**   |
| low/info     | **allow**      |

The `on_risk` config then transforms the recommendation:

- `escalate` (default): escalate → HITL prompt
- `block`: escalate → block
- `audit`: escalate → allow (log only)

Blocklisted and non-existent packages are always blocked regardless of `on_risk`.

## Role overrides

Different roles can have different risk tolerances:

```yaml
# governance-rules.yaml
roles:
  analyst:
    dependency_guardian:
      on_risk: block # Strictest — no risky installs
  project_lead:
    dependency_guardian:
      on_risk: escalate # Prompt for approval
  admin:
    dependency_guardian:
      on_risk: audit # Log only
```

## Audit events

Dependency Guardian produces five audit event types:

| Event           | When                                                |
| --------------- | --------------------------------------------------- |
| `dep_allowed`   | Install approved — all packages passed checks       |
| `dep_blocked`   | Install blocked — critical risk or `on_risk: block` |
| `dep_escalated` | Install escalated to human for approval             |
| `dep_approved`  | Human approved an escalated install                 |
| `dep_rejected`  | Human rejected an escalated install                 |

Each event includes metadata with the command, package names, risk levels, and signal names.

Query dependency events from your audit log:

```bash
cat ~/.pi/agent/audit.jsonl | jq 'select(.event | startswith("dep_"))'
```

## Lockfile installs

Lockfile-based installs are automatically skipped (no checks needed):

- `npm ci`
- `pnpm install --frozen-lockfile`
- `yarn install --frozen-lockfile`
- `pip install --require-hashes`

These commands install exact, pre-resolved versions — no supply-chain risk from name confusion.

## Zero dependencies

Dependency Guardian adds **no new runtime dependencies**. It uses:

- Built-in `fetch()` (Node 22+) for registry and OSV.dev API calls
- An in-module Levenshtein distance implementation for typosquat detection
- In-memory LRU caching (200 entries) for registry metadata
