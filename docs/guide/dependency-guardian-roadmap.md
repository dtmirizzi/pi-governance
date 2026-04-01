# Dependency Guardian — Phase 2 Roadmap

This document tracks planned enhancements for Dependency Guardian beyond the base implementation (Phase 1).

## Planned features

### Socket.dev integration

Integrate with [Socket.dev](https://socket.dev) for deeper supply-chain analysis:

- **API key config**: `dependency_guardian.socket_api_key` or `${SOCKET_API_KEY}` env var
- **Package scoring**: Socket's proprietary risk scores complement OSV.dev vulnerability data
- **Typosquat detection**: Socket maintains a curated typosquat database
- **Install script analysis**: Static analysis of pre/post-install scripts for suspicious behavior (network calls, filesystem access outside node_modules, obfuscated code)

### OpenSSF Scorecard integration

Query [OpenSSF Scorecard](https://scorecard.dev) for repository-level health metrics:

- Branch protection, CI/CD security, dependency update practices
- Maintained status, contributor diversity
- Map scorecard scores to risk signals

### Transitive dependency analysis

Phase 1 only validates direct packages in the install command. Phase 2 will:

- Run a dry-install (`npm install --dry-run`, `pip install --dry-run`) to resolve the full dependency tree
- Validate transitive dependencies against the same checks (existence, reputation, vulnerabilities)
- Flag deep transitive deps that are new, low-download, or vulnerable
- Add a `checks.transitive_deps: true` config toggle

### Write tool interception

Currently, guardian only intercepts bash install commands. Phase 2 will also intercept:

- `write` tool calls that modify `package.json` dependencies
- `write` tool calls that modify `requirements.txt`, `pyproject.toml`, `Cargo.toml`
- Same validation pipeline, triggered by file content analysis

### Ecosystem expansion

- **Go modules**: `go get`, `go install` — query `pkg.go.dev` API
- **Ruby gems**: `gem install`, `bundle add` — query `rubygems.org` API
- **Composer**: `composer require` — query `packagist.org` API

### Enhanced caching

- Persistent disk cache (SQLite or JSON) for registry metadata
- Configurable TTL per data source
- Cache warming for allowlisted packages at session start

### Reporting

- `dep_report` audit event with periodic summaries of all validated packages
- `/governance deps` slash command to view recent dependency decisions
- Export to CSV/JSON for compliance reporting

## Contributing

If you'd like to help with Phase 2, see [CONTRIBUTING.md](https://github.com/dtmirizzi/pi-governance/blob/main/CONTRIBUTING.md) for guidelines. Issues tagged `dependency-guardian` track individual work items.
