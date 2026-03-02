# Security Hardening

This guide covers security considerations for deploying pi-governance in agentic environments.

## Config Self-Protection

pi-governance includes a **hardcoded guard** that prevents agents from modifying their own governance configuration files. This guard:

- Runs as **step 0** in the tool-call pipeline — before dry-run checks, budget checks, and policy evaluation
- Cannot be disabled or bypassed through configuration changes
- Blocks `write` and `edit` tool calls targeting governance files
- Logs a `config_tampered` audit event when a modification attempt is detected

### Protected files

The following paths are automatically protected:

| Path                    | Description                                                           |
| ----------------------- | --------------------------------------------------------------------- |
| Loaded config source    | The `.pi/governance.yaml` (or custom path) that was loaded at startup |
| Rules file              | The `governance-rules.yaml` referenced by `policy.yaml.rules_file`    |
| `.pi/governance.yaml`   | Well-known config path relative to the working directory              |
| `governance-rules.yaml` | Well-known rules path relative to the working directory               |

### Bash detection

In addition to blocking file-tool writes, the bash classifier includes patterns that detect shell commands targeting governance files:

```bash
# All of these are classified as "dangerous" and blocked:
echo "..." > governance.yaml
sed -i 's/admin/analyst/' governance-rules.yaml
cp /tmp/evil.yaml .pi/governance.yaml
rm governance-rules.yaml
tee .pi/governance.yaml < /tmp/config
mv /tmp/override.yaml governance-rules.yaml
```

These patterns are in the hardcoded `DANGEROUS_PATTERNS` array and cannot be removed via role overrides.

## OS-Level File Permissions

For production agentic deployments, layer OS file permissions on top of pi-governance guards:

```bash
# Make config files read-only for the agent's OS user
chmod 444 .pi/governance.yaml
chmod 444 governance-rules.yaml

# Or set ownership to a different user
chown root:root .pi/governance.yaml governance-rules.yaml
chmod 644 .pi/governance.yaml governance-rules.yaml
```

This provides defense-in-depth — even if an agent bypasses the tool-call pipeline (e.g., through a novel attack vector), the OS will deny the write.

### Recommended permissions

| File                    | Owner              | Mode  | Notes                                |
| ----------------------- | ------------------ | ----- | ------------------------------------ |
| `.pi/governance.yaml`   | root (or ops user) | `444` | Agent user has read-only access      |
| `governance-rules.yaml` | root (or ops user) | `444` | Agent user has read-only access      |
| Audit log directory     | agent user         | `755` | Agent needs write access for logging |

## Environment Variable Protection

pi-governance reads sensitive configuration from environment variables:

| Variable                  | Purpose               |
| ------------------------- | --------------------- |
| `GRWND_ROLE`              | Agent role assignment |
| `GRWND_USER_ID`           | User identity         |
| `GRWND_ORG_UNIT`          | Organization unit     |
| `GRWND_GOVERNANCE_CONFIG` | Custom config path    |

### Recommendations

- **Do not export secrets into the agent's environment.** Use a secrets manager or inject at process startup only.
- **Set `GRWND_ROLE` in the process launcher**, not in `.bashrc` or `.zshrc` where the agent could modify it.
- **Use `GRWND_GOVERNANCE_CONFIG`** to point to a read-only config location outside the working directory.
- The bash classifier blocks `export` commands containing `KEY`, `TOKEN`, `SECRET`, `PASSWORD`, or `CREDENTIAL`.

## Threat Model

### What pi-governance protects against

| Threat                                      | Mitigation                                           |
| ------------------------------------------- | ---------------------------------------------------- |
| Agent runs `rm -rf /`                       | Bash classifier blocks destructive commands          |
| Agent writes to `/etc/passwd`               | Path boundary policy restricts file access           |
| Agent modifies its own governance config    | Hardcoded config self-protection (step 0)            |
| Agent uses `sed -i` to edit config via bash | Bash patterns detect governance file targeting       |
| Agent exfiltrates API keys in tool output   | DLP scanner masks or blocks sensitive data           |
| Agent escalates from `analyst` to `admin`   | Config files are protected; role comes from env vars |

### What requires additional measures

| Threat                                                 | Recommended mitigation                                         |
| ------------------------------------------------------ | -------------------------------------------------------------- |
| Agent modifies env vars at runtime                     | OS-level read-only env, containerized execution                |
| Agent exploits a vulnerability in pi-governance itself | Keep pi-governance updated; run agents in sandboxed containers |
| Agent communicates with external services              | Network-level controls (firewall rules, egress filtering)      |
| Agent reads sensitive files it shouldn't               | Configure `blocked_paths` in role policy                       |

## Best Practices Checklist

- [ ] Set governance config files to read-only (`chmod 444`)
- [ ] Set `GRWND_ROLE` in the process launcher, not in shell config
- [ ] Use `blocked_paths` to restrict access to sensitive directories
- [ ] Enable audit logging with a persistent sink (JSONL + webhook)
- [ ] Set `execution_mode: supervised` for untrusted agents
- [ ] Configure `human_approval.required_for` for destructive tools
- [ ] Set reasonable `token_budget_daily` limits per role
- [ ] Enable DLP with `mode: block` for high-sensitivity environments
- [ ] Monitor `config_tampered` audit events as a security signal
- [ ] Run agents in containers with minimal filesystem access
- [ ] Use network-level egress filtering for production deployments
