<p align="center">
  <img src="assets/logo.png" alt="pi-governance logo" width="180" />
</p>

<h1 align="center">@grwnd/pi-governance</h1>

<p align="center">
  Governance, RBAC, DLP, and audit for Pi coding agents.
</p>

<p align="center">
  <a href="https://github.com/dtmirizzi/pi-governance/actions/workflows/ci.yml"><img src="https://github.com/dtmirizzi/pi-governance/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://www.npmjs.com/package/@grwnd/pi-governance"><img src="https://img.shields.io/npm/v/@grwnd/pi-governance" alt="npm pi-governance" /></a>
  <a href="https://www.npmjs.com/package/@grwnd/openclaw-governance"><img src="https://img.shields.io/npm/v/@grwnd/openclaw-governance?label=openclaw-governance" alt="npm openclaw-governance" /></a>
  <a href="https://github.com/dtmirizzi/pi-governance/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License" /></a>
  <a href="https://dtmirizzi.github.io/pi-governance/"><img src="https://img.shields.io/badge/docs-GitHub%20Pages-blue" alt="Docs" /></a>
</p>

---

## The Problem

AI coding agents have full access to your terminal, filesystem, and secrets. Without governance, an agent can run `rm -rf`, read `.env` files, or exfiltrate API keys through tool calls — with no audit trail.

## The Solution

`pi-governance` intercepts every tool call and enforces policy before execution.

```bash
pi install npm:@grwnd/pi-governance
```

**What you get immediately:**

- **Bash blocking** — 60+ patterns classify commands as safe/dangerous/needs-review
- **DLP** — API keys blocked on input, PII masked on output
- **RBAC** — Role-based tool and path permissions
- **Audit** — Every decision logged as structured JSON
- **HITL** — Human approval for sensitive operations
- **Budgets** — Per-role tool invocation limits
- **Config self-protection** — Agents cannot modify their own governance files

## Customize

### Interactive wizard

```
/governance init
```

Opens a browser-based wizard to configure roles, DLP, audit, and HITL. Generates YAML config files.

### Manual YAML

Create `.pi/governance.yaml` and `governance-rules.yaml` — see the [Configuration Reference](https://dtmirizzi.github.io/pi-governance/reference/config).

### Set identity

```bash
export PI_GOV_ROLE=project_lead  # analyst | project_lead | admin | auditor
pi
/governance status
```

## Documentation

Full docs at **[dtmirizzi.github.io/pi-governance](https://dtmirizzi.github.io/pi-governance/)**.

- [Why Governance?](https://dtmirizzi.github.io/pi-governance/guide/why) — What can go wrong without controls
- [Quick Start](https://dtmirizzi.github.io/pi-governance/guide/quickstart) — Install and configure
- [Common Scenarios](https://dtmirizzi.github.io/pi-governance/guide/scenarios) — Copy-paste configs
- [YAML Policies](https://dtmirizzi.github.io/pi-governance/guide/yaml-policies) — Full policy reference
- [DLP Guide](https://dtmirizzi.github.io/pi-governance/guide/dlp) — Data loss prevention
- [OpenClaw Integration](https://dtmirizzi.github.io/pi-governance/guide/openclaw) — MCP tool governance

## License

[Apache-2.0](LICENSE)
