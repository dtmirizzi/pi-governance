# policies/tools.polar — Tool-level Polar policies
#
# This file extends base.polar with fine-grained tool permissions.
# Import this alongside base.polar for the complete policy set.

# Tool-specific approval overrides
# Project leads can auto-approve read and edit but need approval for bash/write
has_permission(user: User, "auto_approve", tool: Tool) if
  user.role = "project_lead" and
  tool.name in ["read", "edit", "grep", "find", "ls"];

# Analyst cannot auto-approve anything — all invocations require approval
# (no auto_approve rule for analyst role)

# Auditor cannot auto-approve anything — all invocations require approval
# (no auto_approve rule for auditor role)
