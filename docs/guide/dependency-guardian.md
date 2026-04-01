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

::: warning Crates.io limitation
Cargo commands are parsed correctly, but **registry metadata fetching is not yet implemented** for crates.io. All Rust packages will return a `package_not_found` signal (critical severity) because the registry lookup returns "not found". Vulnerability scanning via OSV.dev still works for crates.io. Full crates.io registry support is planned for Phase 2.
:::

### Version parsing

Dependency Guardian extracts version specifiers from install commands using ecosystem-specific syntax:

| Ecosystem | Syntax                                | Example                        |
| --------- | ------------------------------------- | ------------------------------ |
| npm       | `pkg@version`                         | `npm install lodash@4.17.21`   |
| PyPI      | `pkg==version` (and `>=`, `~=`, `!=`) | `pip install requests==2.31.0` |
| crates.io | `pkg@version`                         | `cargo add serde@1.0`          |

When a version is specified, it is passed to OSV.dev for version-specific vulnerability matching.

### Scoped packages

npm scoped packages (`@scope/package`) are fully supported. When checking for typosquats, the scope prefix is stripped before comparison — `@myorg/lodash` is compared as `lodash`.

### Command skipping

Certain commands are automatically skipped (no checks performed):

- **No packages specified**: `npm install` or `yarn install` with no package arguments (reinstalls from `package.json`)
- **File-based pip installs**: `pip install -r requirements.txt`, `pip install ./local-pkg`, `pip install https://...`, `pip install git+https://...` — file paths and URLs are ignored during package extraction

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

Built-in allowlists cover ~75 popular npm packages and ~50 popular PyPI packages. User-configured entries are **merged** with the defaults — your additions extend the built-in lists, they don't replace them.

Allowlisted packages skip **both reputation checks and typosquat detection**, but still receive vulnerability scanning and blocklist checks.

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

#### Built-in blocklist

In addition to user-configured entries, Dependency Guardian ships with **23 known malicious package names** (historical typosquats and compromised packages) and **9 regex patterns** that match common malware naming conventions:

- **Exact names**: `crossenv`, `gruntcli`, `mongose`, `nodemailer-js`, `shadowsock`, `flatmap-stream`, `colourama`, `numppy`, `djanga`, `urlib3`, and others
- **Patterns**: names ending in `-free-download`, `-crack`, `-keygen`, `-license-key`, `-hack`, `-serial`, `-activation`, `-premium-free`, `-generator-free`

The allowlist also serves as the **corpus for typosquat detection** — package names are compared against allowlisted names to identify suspiciously similar names.

## Risk signals

| Signal                | Severity | Trigger                                                                                                                      |
| --------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `package_not_found`   | critical | Package does not exist on the registry                                                                                       |
| `on_blocklist`        | critical | Package matches the blocklist                                                                                                |
| `known_vulnerability` | varies   | OSV.dev reports a CVE (severity from CVSS v3 score; defaults to medium when no CVSS data is available)                       |
| `very_new_package`    | high     | Created less than 7 days ago                                                                                                 |
| `typosquat_suspect`   | high     | Name is suspiciously similar to an allowlisted package (see [Typosquat detection algorithm](#typosquat-detection-algorithm)) |
| `low_downloads`       | high/med | Weekly downloads below threshold (< 10 = high)                                                                               |
| `has_install_scripts` | medium   | Package has preinstall/install/postinstall scripts (npm only; PyPI always reports false)                                     |
| `new_package`         | medium   | Created less than `min_age_days` ago                                                                                         |
| `no_repository`       | low      | No source repository URL in metadata                                                                                         |
| `no_readme`           | low      | No README content                                                                                                            |
| `no_license`          | low      | No license declared                                                                                                          |
| `single_maintainer`   | info     | Only one maintainer (see [PyPI note](#pypi-limitations))                                                                     |

### Typosquat detection algorithm

Dependency Guardian uses a built-in [Levenshtein distance](https://en.wikipedia.org/wiki/Levenshtein_distance) implementation (Wagner-Fischer algorithm) to detect typosquats. Before comparison, package names are **normalized**:

1. Scope prefixes are stripped (`@scope/pkg` → `pkg`)
2. Separators are removed (hyphens `-`, underscores `_`, dots `.`)
3. Names are lowercased

A package is flagged as `typosquat_suspect` if **any** of these conditions match against an allowlisted package:

| Condition                                            | Example                |
| ---------------------------------------------------- | ---------------------- |
| Edit distance = 1 (always flagged)                   | `expresss` → `express` |
| Edit distance = 2 **and** normalized name length ≥ 5 | `requets` → `requests` |
| Normalized similarity ≥ 0.85                         | `loadash` → `lodash`   |

The similarity score is computed as `1 - (distance / max(len(a), len(b)))`.

::: tip
Typosquat detection is **skipped for allowlisted packages**. If you add a package to your allowlist, it won't be flagged even if its name resembles another popular package.
:::

### Vulnerability severity mapping

Vulnerability severity is derived from CVSS v3 scores reported by OSV.dev:

| CVSS v3 Score | Mapped Severity      |
| ------------- | -------------------- |
| ≥ 9.0         | critical             |
| ≥ 7.0         | high                 |
| ≥ 4.0         | medium               |
| < 4.0         | low                  |
| No CVSS data  | **medium** (default) |

When a version is specified in the install command (e.g., `npm install lodash@4.17.20`), the vulnerability query is version-specific — only vulnerabilities affecting that version are returned.

### PyPI limitations

- **Maintainer count**: PyPI does not expose maintainer counts. Dependency Guardian approximates this as 0 or 1 based on whether the `author` or `maintainer` field is set. The `single_maintainer` signal may trigger for popular PyPI packages that have a listed author.
- **Install scripts**: PyPI packages do not have `preinstall`/`postinstall` scripts in the same way as npm. The `has_install_scripts` signal always reports false for PyPI packages.

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

### Human-in-the-loop (HITL) confirmation

When a package is escalated, the user sees a confirmation dialog titled **"Dependency Review Required"** with a summary that includes:

- The full install command
- Each flagged package name, ecosystem, and overall risk level
- All triggered risk signals with severity indicators (`!!` for critical/high, `!` for medium)
- The user can **approve** or **reject** — the decision is logged as `dep_approved` or `dep_rejected`

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

## Configuration live-reload

Changes to the `dependency_guardian` section in `governance.yaml` take effect immediately — no restart required. When the config watcher detects a file change, the guardian config is re-resolved and applied to subsequent install commands.

## Network and performance

Dependency Guardian adds **no new runtime dependencies**. It uses:

- Built-in `fetch()` (Node 22+) for registry and OSV.dev API calls
- An in-module Levenshtein distance implementation for typosquat detection
- In-memory FIFO cache (200 entries) for registry metadata

### Request timeouts

All HTTP requests (registry lookups and OSV.dev queries) have a **5-second timeout**. If a request times out:

- **Registry metadata**: The package is treated as "not found" (`package_not_found` signal)
- **Vulnerability queries**: The package gets an empty vulnerability list (no error surfaced to the user)
- **Download stats**: Failed download lookups are non-critical — the `low_downloads` signal is simply not emitted

### Batch optimization

When multiple packages are installed in a single command (e.g., `npm install lodash axios chalk`), vulnerability queries are batched into a single request to OSV.dev's `/v1/querybatch` endpoint for efficiency. Single-package installs use the simpler `/v1/query` endpoint.
