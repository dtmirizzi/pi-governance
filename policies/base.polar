# policies/base.polar — Default Oso/Polar authorization policies

# Actor model
actor User {}

# Resources
resource Tool {
  permissions = ["invoke", "auto_approve"];
  roles = ["analyst", "project_lead", "admin", "auditor"];
}

resource FilePath {
  permissions = ["read", "write"];
  roles = ["analyst", "project_lead", "admin", "auditor"];
}

resource AgentSession {
  permissions = ["run_autonomous", "run_supervised", "run_dry"];
  roles = ["analyst", "project_lead", "admin", "auditor"];
}

# --- Analyst policies ---

has_permission(user: User, "invoke", tool: Tool) if
  user.role = "analyst" and
  tool.name in ["read", "grep", "find", "ls"];

has_permission(user: User, "read", path: FilePath) if
  user.role = "analyst" and
  user.orgUnit = path.orgUnit;

has_permission(user: User, "run_supervised", _session: AgentSession) if
  user.role = "analyst";

# --- Project Lead policies ---

has_permission(user: User, "invoke", tool: Tool) if
  user.role = "project_lead" and
  tool.name in ["read", "write", "edit", "bash", "grep", "find", "ls"];

has_permission(user: User, "auto_approve", tool: Tool) if
  user.role = "project_lead" and
  tool.name in ["read", "edit", "grep", "find", "ls"];

has_permission(user: User, "read", path: FilePath) if
  user.role = "project_lead" and
  user.orgUnit = path.orgUnit;

has_permission(user: User, "write", path: FilePath) if
  user.role = "project_lead" and
  user.orgUnit = path.orgUnit;

has_permission(user: User, "run_supervised", _session: AgentSession) if
  user.role = "project_lead";

# --- Admin policies ---

has_permission(_user: User, "invoke", _tool: Tool) if
  _user.role = "admin";

has_permission(_user: User, "auto_approve", _tool: Tool) if
  _user.role = "admin";

has_permission(_user: User, "read", _path: FilePath) if
  _user.role = "admin";

has_permission(_user: User, "write", _path: FilePath) if
  _user.role = "admin";

has_permission(user: User, "run_autonomous", _session: AgentSession) if
  user.role = "admin";

# --- Auditor policies ---

has_permission(user: User, "invoke", tool: Tool) if
  user.role = "auditor" and
  tool.name in ["read", "grep", "find", "ls"];

has_permission(user: User, "read", _path: FilePath) if
  user.role = "auditor";

has_permission(user: User, "run_dry", _session: AgentSession) if
  user.role = "auditor";
