export const WIZARD_HTML: string = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Pi Governance — Setup Wizard</title>
<style>
  :root {
    --bg: #f8f9fa;
    --bg-surface: #ffffff;
    --bg-surface-alt: #f1f3f5;
    --bg-code: #e9ecef;
    --text: #212529;
    --text-muted: #6c757d;
    --text-inverse: #ffffff;
    --border: #dee2e6;
    --border-focus: #4263eb;
    --primary: #4263eb;
    --primary-hover: #3b5bdb;
    --primary-subtle: #dbe4ff;
    --success: #2f9e44;
    --success-subtle: #d3f9d8;
    --danger: #e03131;
    --danger-subtle: #ffe3e3;
    --warning: #f08c00;
    --warning-subtle: #fff3bf;
    --radius: 8px;
    --radius-sm: 4px;
    --shadow: 0 1px 3px rgba(0,0,0,0.08);
    --shadow-lg: 0 4px 12px rgba(0,0,0,0.1);
    --font-mono: 'SF Mono', 'Cascadia Code', 'Fira Code', monospace;
    --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    --transition: 150ms ease;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #1a1b1e;
      --bg-surface: #25262b;
      --bg-surface-alt: #2c2e33;
      --bg-code: #2c2e33;
      --text: #c1c2c5;
      --text-muted: #909296;
      --text-inverse: #1a1b1e;
      --border: #373a40;
      --border-focus: #5c7cfa;
      --primary: #5c7cfa;
      --primary-hover: #748ffc;
      --primary-subtle: #1b2559;
      --success: #51cf66;
      --success-subtle: #0b3d1a;
      --danger: #ff6b6b;
      --danger-subtle: #3d0b0b;
      --warning: #fcc419;
      --warning-subtle: #3d2e00;
      --shadow: 0 1px 3px rgba(0,0,0,0.3);
      --shadow-lg: 0 4px 12px rgba(0,0,0,0.4);
    }
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: var(--font-sans);
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
    min-height: 100vh;
  }

  .layout {
    display: grid;
    grid-template-columns: 1fr 420px;
    gap: 0;
    min-height: 100vh;
  }

  @media (max-width: 1024px) {
    .layout { grid-template-columns: 1fr; }
    .preview-panel { display: none; }
  }

  /* --- Left column: Form --- */
  .form-column {
    padding: 32px 40px 80px;
    overflow-y: auto;
    max-height: 100vh;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }

  .logo-icon {
    width: 36px; height: 36px;
    background: var(--primary);
    border-radius: var(--radius);
    display: flex; align-items: center; justify-content: center;
    color: var(--text-inverse);
    font-weight: 700; font-size: 18px;
  }

  .logo-text {
    font-size: 20px;
    font-weight: 700;
    color: var(--text);
  }

  .logo-text span { color: var(--text-muted); font-weight: 400; }

  h1 {
    font-size: 28px;
    font-weight: 700;
    margin: 24px 0 8px;
  }

  .subtitle {
    color: var(--text-muted);
    font-size: 15px;
    margin-bottom: 32px;
  }

  /* Sections */
  .section {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 24px;
    margin-bottom: 20px;
    box-shadow: var(--shadow);
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
    cursor: pointer;
    user-select: none;
  }

  .section-header h2 {
    font-size: 16px;
    font-weight: 600;
    flex: 1;
  }

  .section-badge {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .badge-required { background: var(--danger-subtle); color: var(--danger); }
  .badge-optional { background: var(--primary-subtle); color: var(--primary); }

  .section-icon {
    width: 32px; height: 32px;
    border-radius: var(--radius-sm);
    display: flex; align-items: center; justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
  }

  .section-body { display: block; }
  .section.collapsed .section-body { display: none; }
  .section-chevron {
    transition: transform var(--transition);
    color: var(--text-muted);
    font-size: 12px;
  }
  .section.collapsed .section-chevron { transform: rotate(-90deg); }

  /* Form elements */
  label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 4px;
  }

  .label-hint {
    font-weight: 400;
    color: var(--text-muted);
    font-size: 12px;
  }

  input[type="text"],
  input[type="number"],
  select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg-surface);
    color: var(--text);
    font-size: 14px;
    font-family: var(--font-sans);
    transition: border-color var(--transition);
    outline: none;
  }

  input:focus, select:focus {
    border-color: var(--border-focus);
    box-shadow: 0 0 0 2px var(--primary-subtle);
  }

  .field { margin-bottom: 16px; }

  .field-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .field-row-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
  }

  /* Toggle switch */
  .toggle-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }

  .toggle {
    position: relative;
    width: 40px; height: 22px;
    flex-shrink: 0;
  }

  .toggle input { display: none; }

  .toggle-slider {
    position: absolute;
    inset: 0;
    background: var(--border);
    border-radius: 11px;
    cursor: pointer;
    transition: background var(--transition);
  }

  .toggle-slider::before {
    content: '';
    position: absolute;
    width: 16px; height: 16px;
    left: 3px; top: 3px;
    background: white;
    border-radius: 50%;
    transition: transform var(--transition);
  }

  .toggle input:checked + .toggle-slider {
    background: var(--primary);
  }

  .toggle input:checked + .toggle-slider::before {
    transform: translateX(18px);
  }

  .toggle-label {
    font-size: 14px;
    font-weight: 500;
  }

  /* Role cards */
  .role-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .role-card {
    border: 2px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
    cursor: pointer;
    transition: all var(--transition);
    position: relative;
  }

  .role-card:hover { border-color: var(--primary); }

  .role-card.selected {
    border-color: var(--primary);
    background: var(--primary-subtle);
  }

  .role-card-check {
    position: absolute;
    top: 12px; right: 12px;
    width: 20px; height: 20px;
    border: 2px solid var(--border);
    border-radius: 4px;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px;
    color: transparent;
    transition: all var(--transition);
  }

  .role-card.selected .role-card-check {
    background: var(--primary);
    border-color: var(--primary);
    color: white;
  }

  .role-name {
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 4px;
  }

  .role-desc {
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 8px;
  }

  .role-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .role-tag {
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 3px;
    background: var(--bg-surface-alt);
    color: var(--text-muted);
    font-family: var(--font-mono);
  }

  .role-details {
    display: none;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--border);
  }

  .role-card.selected .role-details { display: block; }

  /* Chip selector */
  .chip-group {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }

  .chip {
    padding: 5px 14px;
    border: 1px solid var(--border);
    border-radius: 16px;
    font-size: 13px;
    cursor: pointer;
    transition: all var(--transition);
    background: var(--bg-surface);
    color: var(--text);
  }

  .chip:hover { border-color: var(--primary); }

  .chip.active {
    background: var(--primary);
    border-color: var(--primary);
    color: var(--text-inverse);
  }

  /* Pattern list */
  .pattern-list { margin-top: 12px; }

  .pattern-item {
    display: grid;
    grid-template-columns: 1fr 1.5fr auto auto;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
  }

  .pattern-item input, .pattern-item select {
    font-size: 13px;
    padding: 6px 8px;
  }

  .btn-remove {
    background: none;
    border: none;
    color: var(--danger);
    cursor: pointer;
    font-size: 18px;
    padding: 4px;
    line-height: 1;
  }

  .btn-add {
    background: none;
    border: 1px dashed var(--border);
    border-radius: var(--radius-sm);
    padding: 6px 14px;
    color: var(--primary);
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all var(--transition);
  }

  .btn-add:hover {
    border-color: var(--primary);
    background: var(--primary-subtle);
  }

  /* Allowlist */
  .allowlist-item {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }

  .allowlist-item input { flex: 1; font-size: 13px; padding: 6px 8px; }

  /* Sink list */
  .sink-item {
    background: var(--bg-surface-alt);
    border-radius: var(--radius-sm);
    padding: 12px;
    margin-bottom: 8px;
    position: relative;
  }

  .sink-item .btn-remove {
    position: absolute;
    top: 8px; right: 8px;
  }

  /* --- Right column: Preview --- */
  .preview-panel {
    background: var(--bg-surface-alt);
    border-left: 1px solid var(--border);
    padding: 24px;
    display: flex;
    flex-direction: column;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow: hidden;
  }

  .preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    flex-shrink: 0;
  }

  .preview-header h3 {
    font-size: 14px;
    font-weight: 600;
  }

  .preview-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 12px;
    flex-shrink: 0;
  }

  .preview-tab {
    padding: 4px 12px;
    font-size: 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg-surface);
    cursor: pointer;
    color: var(--text-muted);
    transition: all var(--transition);
  }

  .preview-tab.active {
    background: var(--primary);
    border-color: var(--primary);
    color: var(--text-inverse);
  }

  .preview-content {
    flex: 1;
    overflow-y: auto;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
  }

  .preview-content pre {
    font-family: var(--font-mono);
    font-size: 12px;
    line-height: 1.5;
    white-space: pre;
    color: var(--text);
    margin: 0;
  }

  /* Bottom bar */
  .bottom-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 420px;
    padding: 16px 40px;
    background: var(--bg-surface);
    border-top: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    z-index: 100;
    box-shadow: 0 -2px 8px rgba(0,0,0,0.06);
  }

  @media (max-width: 1024px) {
    .bottom-bar { right: 0; }
  }

  .btn-primary {
    padding: 10px 28px;
    background: var(--primary);
    color: var(--text-inverse);
    border: none;
    border-radius: var(--radius);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background var(--transition);
  }

  .btn-primary:hover { background: var(--primary-hover); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  .btn-secondary {
    padding: 10px 20px;
    background: var(--bg-surface);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition);
  }

  .btn-secondary:hover { border-color: var(--primary); color: var(--primary); }

  .save-status {
    font-size: 13px;
    color: var(--text-muted);
  }

  .save-status.success { color: var(--success); }
  .save-status.error { color: var(--danger); }

  /* Toast */
  .toast {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: var(--radius);
    font-size: 14px;
    font-weight: 500;
    z-index: 1000;
    box-shadow: var(--shadow-lg);
    transform: translateY(-10px);
    opacity: 0;
    transition: all 300ms ease;
    pointer-events: none;
  }

  .toast.visible { transform: translateY(0); opacity: 1; pointer-events: auto; }
  .toast.success { background: var(--success); color: white; }
  .toast.error { background: var(--danger); color: white; }

  /* Helpers */
  .help-text {
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 4px;
  }

  .divider {
    border: none;
    border-top: 1px solid var(--border);
    margin: 16px 0;
  }

  .hidden { display: none !important; }
</style>
</head>
<body>
<div class="layout">
  <!-- ═══════════ LEFT: FORM ═══════════ -->
  <div class="form-column">
    <div class="logo">
      <div class="logo-icon">G</div>
      <div class="logo-text">Pi Governance <span>Setup Wizard</span></div>
    </div>

    <h1>Configure your governance policy</h1>
    <p class="subtitle">
      AI coding agents are powerful but need guardrails. This wizard generates a
      <code>governance.yaml</code> and <code>governance-rules.yaml</code> to control
      tool access, bash safety, data-loss prevention, human approvals, and audit logging.
    </p>

    <!-- ── 1. Roles ── -->
    <div class="section" id="sec-roles">
      <div class="section-header" onclick="toggleSection('sec-roles')">
        <div class="section-icon" style="background:var(--primary-subtle);color:var(--primary)">&#x1f465;</div>
        <h2>Roles</h2>
        <span class="section-badge badge-required">Required</span>
        <span class="section-chevron">&#9660;</span>
      </div>
      <div class="section-body">
        <p class="help-text" style="margin-bottom:12px">Select the roles your team needs. Each role defines tool access, execution mode, and approval rules.</p>
        <div class="role-grid" id="role-grid"></div>
      </div>
    </div>

    <!-- ── 2. DLP ── -->
    <div class="section" id="sec-dlp">
      <div class="section-header" onclick="toggleSection('sec-dlp')">
        <div class="section-icon" style="background:var(--warning-subtle);color:var(--warning)">&#x1f6e1;</div>
        <h2>Data Loss Prevention</h2>
        <span class="section-badge badge-optional">Optional</span>
        <span class="section-chevron">&#9660;</span>
      </div>
      <div class="section-body">
        <div class="toggle-row">
          <label class="toggle"><input type="checkbox" id="dlp-enabled" checked onchange="updatePreview()"><span class="toggle-slider"></span></label>
          <span class="toggle-label">Enable DLP scanning</span>
        </div>

        <div id="dlp-options">
          <div class="field">
            <label>Default Mode</label>
            <div class="chip-group" id="dlp-mode">
              <span class="chip active" data-value="audit" onclick="selectChip(this)">Audit</span>
              <span class="chip" data-value="mask" onclick="selectChip(this)">Mask</span>
              <span class="chip" data-value="block" onclick="selectChip(this)">Block</span>
            </div>
          </div>

          <div class="field-row">
            <div class="field">
              <label>On Input <span class="label-hint">(agent receives)</span></label>
              <select id="dlp-on-input" onchange="updatePreview()">
                <option value="">Use default mode</option>
                <option value="audit">Audit</option>
                <option value="mask">Mask</option>
                <option value="block" selected>Block</option>
              </select>
            </div>
            <div class="field">
              <label>On Output <span class="label-hint">(agent produces)</span></label>
              <select id="dlp-on-output" onchange="updatePreview()">
                <option value="">Use default mode</option>
                <option value="audit">Audit</option>
                <option value="mask" selected>Mask</option>
                <option value="block">Block</option>
              </select>
            </div>
          </div>

          <hr class="divider">
          <label>Built-in Patterns</label>
          <div class="toggle-row" style="margin-top:6px">
            <label class="toggle"><input type="checkbox" id="dlp-secrets" checked onchange="updatePreview()"><span class="toggle-slider"></span></label>
            <span class="toggle-label">Secrets <span class="label-hint">(API keys, tokens, passwords)</span></span>
          </div>
          <div class="toggle-row">
            <label class="toggle"><input type="checkbox" id="dlp-pii" checked onchange="updatePreview()"><span class="toggle-slider"></span></label>
            <span class="toggle-label">PII <span class="label-hint">(emails, phone numbers, SSNs)</span></span>
          </div>

          <hr class="divider">
          <label>Masking Options</label>
          <div class="field-row-3" style="margin-top:8px">
            <div class="field">
              <label>Strategy</label>
              <select id="dlp-mask-strategy" onchange="updatePreview()">
                <option value="partial" selected>Partial</option>
                <option value="full">Full</option>
                <option value="hash">Hash</option>
              </select>
            </div>
            <div class="field">
              <label>Show Chars</label>
              <input type="number" id="dlp-mask-show" value="4" min="0" onchange="updatePreview()">
            </div>
            <div class="field">
              <label>Placeholder</label>
              <input type="text" id="dlp-mask-placeholder" value="***" onchange="updatePreview()">
            </div>
          </div>

          <hr class="divider">
          <label>Severity Threshold <span class="label-hint">(minimum severity to trigger DLP)</span></label>
          <div class="chip-group" id="dlp-severity" style="margin-top:6px">
            <span class="chip active" data-value="low" onclick="selectChip(this)">Low</span>
            <span class="chip" data-value="medium" onclick="selectChip(this)">Medium</span>
            <span class="chip" data-value="high" onclick="selectChip(this)">High</span>
            <span class="chip" data-value="critical" onclick="selectChip(this)">Critical</span>
          </div>

          <hr class="divider">
          <label>Custom Patterns</label>
          <div class="pattern-list" id="dlp-custom-patterns"></div>
          <button class="btn-add" onclick="addCustomPattern()">+ Add pattern</button>

          <hr class="divider">
          <label>Allowlist <span class="label-hint">(patterns to ignore)</span></label>
          <div id="dlp-allowlist"></div>
          <button class="btn-add" onclick="addAllowlistEntry()" style="margin-top:8px">+ Add entry</button>
        </div>
      </div>
    </div>

    <!-- ── 3. Bash Classification ── -->
    <div class="section" id="sec-bash">
      <div class="section-header" onclick="toggleSection('sec-bash')">
        <div class="section-icon" style="background:var(--danger-subtle);color:var(--danger)">&#x1f4bb;</div>
        <h2>Bash Classification</h2>
        <span class="section-badge badge-optional">Optional</span>
        <span class="section-chevron">&#9660;</span>
      </div>
      <div class="section-body">
        <p class="help-text" style="margin-bottom:12px">The built-in bash classifier categorizes commands by danger level. Adjust the threshold for auto-blocking.</p>
        <div class="field">
          <label>Auto-block Severity</label>
          <p class="help-text">Commands at or above this severity are blocked without HITL.</p>
          <div class="chip-group" id="bash-severity" style="margin-top:6px">
            <span class="chip" data-value="low" onclick="selectChip(this)">Low</span>
            <span class="chip" data-value="medium" onclick="selectChip(this)">Medium</span>
            <span class="chip active" data-value="high" onclick="selectChip(this)">High</span>
            <span class="chip" data-value="critical" onclick="selectChip(this)">Critical</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── 4. HITL ── -->
    <div class="section" id="sec-hitl">
      <div class="section-header" onclick="toggleSection('sec-hitl')">
        <div class="section-icon" style="background:var(--success-subtle);color:var(--success)">&#x1f9d1;</div>
        <h2>Human-in-the-Loop</h2>
        <span class="section-badge badge-required">Required</span>
        <span class="section-chevron">&#9660;</span>
      </div>
      <div class="section-body">
        <div class="field">
          <label>Default Execution Mode</label>
          <div class="chip-group" id="hitl-mode">
            <span class="chip" data-value="autonomous" onclick="selectChip(this)">Autonomous</span>
            <span class="chip active" data-value="supervised" onclick="selectChip(this)">Supervised</span>
            <span class="chip" data-value="dry_run" onclick="selectChip(this)">Dry Run</span>
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Approval Channel</label>
            <select id="hitl-channel" onchange="updatePreview()">
              <option value="cli" selected>CLI (terminal prompt)</option>
              <option value="webhook">Webhook</option>
            </select>
          </div>
          <div class="field">
            <label>Timeout <span class="label-hint">(seconds)</span></label>
            <input type="number" id="hitl-timeout" value="300" min="10" max="3600" onchange="updatePreview()">
          </div>
        </div>
        <div class="field hidden" id="hitl-webhook-field">
          <label>Webhook URL</label>
          <input type="text" id="hitl-webhook-url" placeholder="https://..." onchange="updatePreview()">
        </div>
      </div>
    </div>

    <!-- ── 5. Audit ── -->
    <div class="section" id="sec-audit">
      <div class="section-header" onclick="toggleSection('sec-audit')">
        <div class="section-icon" style="background:var(--primary-subtle);color:var(--primary)">&#x1f4dd;</div>
        <h2>Audit Logging</h2>
        <span class="section-badge badge-required">Required</span>
        <span class="section-chevron">&#9660;</span>
      </div>
      <div class="section-body">
        <p class="help-text" style="margin-bottom:12px">All governance events are logged to one or more sinks.</p>
        <div id="audit-sinks"></div>
        <button class="btn-add" onclick="addAuditSink()" style="margin-top:8px">+ Add sink</button>
      </div>
    </div>

    <!-- ── 6. Auth ── -->
    <div class="section collapsed" id="sec-auth">
      <div class="section-header" onclick="toggleSection('sec-auth')">
        <div class="section-icon" style="background:var(--bg-surface-alt);color:var(--text-muted)">&#x1f511;</div>
        <h2>Authentication</h2>
        <span class="section-badge badge-optional">Optional</span>
        <span class="section-chevron">&#9660;</span>
      </div>
      <div class="section-body">
        <div class="field">
          <label>Provider</label>
          <div class="chip-group" id="auth-provider">
            <span class="chip active" data-value="env" onclick="selectChip(this)">Environment Vars</span>
            <span class="chip" data-value="local" onclick="selectChip(this)">Local File</span>
            <span class="chip" data-value="oidc" onclick="selectChip(this)">OIDC</span>
          </div>
        </div>
        <div id="auth-env-fields">
          <div class="field-row-3">
            <div class="field">
              <label>User Var</label>
              <input type="text" id="auth-user-var" value="PI_RBAC_USER" onchange="updatePreview()">
            </div>
            <div class="field">
              <label>Role Var</label>
              <input type="text" id="auth-role-var" value="PI_RBAC_ROLE" onchange="updatePreview()">
            </div>
            <div class="field">
              <label>Org Unit Var</label>
              <input type="text" id="auth-org-unit-var" value="PI_RBAC_ORG_UNIT" onchange="updatePreview()">
            </div>
          </div>
        </div>
        <div id="auth-local-fields" class="hidden">
          <div class="field">
            <label>Users File</label>
            <input type="text" id="auth-users-file" value="./users.yaml" onchange="updatePreview()">
          </div>
        </div>
      </div>
    </div>

    <div style="height:80px"></div>
  </div>

  <!-- ═══════════ RIGHT: PREVIEW ═══════════ -->
  <div class="preview-panel">
    <div class="preview-header">
      <h3>Live Preview</h3>
    </div>
    <div class="preview-tabs">
      <span class="preview-tab active" data-tab="governance" onclick="switchTab(this)">governance.yaml</span>
      <span class="preview-tab" data-tab="rules" onclick="switchTab(this)">governance-rules.yaml</span>
    </div>
    <div class="preview-content">
      <pre id="preview-yaml"></pre>
    </div>
  </div>
</div>

<!-- ── Bottom bar ── -->
<div class="bottom-bar">
  <span class="save-status" id="save-status"></span>
  <div style="display:flex;gap:10px">
    <button class="btn-secondary" onclick="handleClose()">Cancel</button>
    <button class="btn-primary" id="btn-save" onclick="handleSave()">Save Configuration</button>
  </div>
</div>

<!-- Toast -->
<div class="toast" id="toast"></div>

<script>
// ─── State ───────────────────────────────────────────────────────────
const PRESET_ROLES = {
  analyst: {
    label: 'Analyst',
    desc: 'Read-only access, every action requires approval.',
    allowed_tools: ['read','grep','find','ls'],
    blocked_tools: ['write','edit','bash'],
    prompt_template: 'analyst',
    execution_mode: 'supervised',
    human_approval: { required_for: ['all'] },
    token_budget_daily: 100000,
    allowed_paths: ['{{project_path}}/**'],
    blocked_paths: ['**/secrets/**', '**/.env*']
  },
  project_lead: {
    label: 'Project Lead',
    desc: 'Full tools, bash & write need human approval.',
    allowed_tools: ['read','write','edit','bash','grep','find','ls'],
    blocked_tools: [],
    prompt_template: 'project-lead',
    execution_mode: 'supervised',
    human_approval: { required_for: ['bash','write'], auto_approve: ['read','edit','grep','find','ls'] },
    token_budget_daily: 500000,
    allowed_paths: ['{{project_path}}/**'],
    blocked_paths: ['**/secrets/**', '**/.env*'],
    bash_overrides: { additional_blocked: ['sudo','ssh','curl.*\\\\|.*sh'] }
  },
  admin: {
    label: 'Admin',
    desc: 'Full autonomous access, no approvals, unlimited budget.',
    allowed_tools: ['all'],
    blocked_tools: [],
    prompt_template: 'admin',
    execution_mode: 'autonomous',
    human_approval: { required_for: [] },
    token_budget_daily: -1,
    allowed_paths: ['**'],
    blocked_paths: []
  },
  auditor: {
    label: 'Auditor',
    desc: 'Dry-run: all calls logged, nothing executed.',
    allowed_tools: ['read','grep','find','ls'],
    blocked_tools: ['write','edit','bash'],
    prompt_template: 'analyst',
    execution_mode: 'dry_run',
    human_approval: { required_for: ['all'] },
    token_budget_daily: 50000,
    allowed_paths: ['**'],
    blocked_paths: ['**/secrets/**']
  }
};

let selectedRoles = { analyst: false, project_lead: true, admin: false, auditor: false };
let customPatterns = [];
let allowlistEntries = [];
let auditSinks = [{ type: 'jsonl', path: '~/.pi/agent/audit.jsonl' }];
let activePreviewTab = 'governance';

// ─── Init ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  renderRoles();
  renderAuditSinks();
  updatePreview();

  try {
    const [configRes, defaultsRes] = await Promise.all([
      fetch('/api/config').catch(() => null),
      fetch('/api/defaults').catch(() => null)
    ]);
    if (configRes && configRes.ok) {
      const cfg = await configRes.json();
      applyConfig(cfg);
    }
    if (defaultsRes && defaultsRes.ok) {
      const defs = await defaultsRes.json();
      if (!configRes || !configRes.ok) applyConfig(defs);
    }
  } catch (e) { /* use built-in defaults */ }

  // watch for webhook channel
  document.getElementById('hitl-channel').addEventListener('change', (e) => {
    document.getElementById('hitl-webhook-field').classList.toggle('hidden', e.target.value !== 'webhook');
    updatePreview();
  });

  // watch dlp toggle
  document.getElementById('dlp-enabled').addEventListener('change', (e) => {
    document.getElementById('dlp-options').classList.toggle('hidden', !e.target.checked);
    updatePreview();
  });
});

// ─── Apply Config ────────────────────────────────────────────────────
function applyConfig(cfg) {
  if (!cfg) return;

  // Auth
  if (cfg.auth) {
    setChipValue('auth-provider', cfg.auth.provider || 'env');
    if (cfg.auth.env) {
      if (cfg.auth.env.user_var) document.getElementById('auth-user-var').value = cfg.auth.env.user_var;
      if (cfg.auth.env.role_var) document.getElementById('auth-role-var').value = cfg.auth.env.role_var;
      if (cfg.auth.env.org_unit_var) document.getElementById('auth-org-unit-var').value = cfg.auth.env.org_unit_var;
    }
    if (cfg.auth.local && cfg.auth.local.users_file) {
      document.getElementById('auth-users-file').value = cfg.auth.local.users_file;
    }
  }

  // HITL
  if (cfg.hitl) {
    if (cfg.hitl.default_mode) setChipValue('hitl-mode', cfg.hitl.default_mode);
    if (cfg.hitl.approval_channel) {
      document.getElementById('hitl-channel').value = cfg.hitl.approval_channel;
      document.getElementById('hitl-webhook-field').classList.toggle('hidden', cfg.hitl.approval_channel !== 'webhook');
    }
    if (cfg.hitl.timeout_seconds) document.getElementById('hitl-timeout').value = cfg.hitl.timeout_seconds;
    if (cfg.hitl.webhook && cfg.hitl.webhook.url) document.getElementById('hitl-webhook-url').value = cfg.hitl.webhook.url;
  }

  // DLP
  if (cfg.dlp) {
    document.getElementById('dlp-enabled').checked = cfg.dlp.enabled !== false;
    document.getElementById('dlp-options').classList.toggle('hidden', !cfg.dlp.enabled);
    if (cfg.dlp.mode) setChipValue('dlp-mode', cfg.dlp.mode);
    if (cfg.dlp.on_input) document.getElementById('dlp-on-input').value = cfg.dlp.on_input;
    if (cfg.dlp.on_output) document.getElementById('dlp-on-output').value = cfg.dlp.on_output;
    if (cfg.dlp.masking) {
      if (cfg.dlp.masking.strategy) document.getElementById('dlp-mask-strategy').value = cfg.dlp.masking.strategy;
      if (cfg.dlp.masking.show_chars != null) document.getElementById('dlp-mask-show').value = cfg.dlp.masking.show_chars;
      if (cfg.dlp.masking.placeholder) document.getElementById('dlp-mask-placeholder').value = cfg.dlp.masking.placeholder;
    }
    if (cfg.dlp.severity_threshold) setChipValue('dlp-severity', cfg.dlp.severity_threshold);
    if (cfg.dlp.built_in) {
      if (cfg.dlp.built_in.secrets != null) document.getElementById('dlp-secrets').checked = cfg.dlp.built_in.secrets;
      if (cfg.dlp.built_in.pii != null) document.getElementById('dlp-pii').checked = cfg.dlp.built_in.pii;
    }
    if (cfg.dlp.custom_patterns) {
      customPatterns = cfg.dlp.custom_patterns;
      renderCustomPatterns();
    }
    if (cfg.dlp.allowlist) {
      allowlistEntries = cfg.dlp.allowlist.map(e => e.pattern || e);
      renderAllowlist();
    }
  }

  // Audit
  if (cfg.audit && cfg.audit.sinks) {
    auditSinks = cfg.audit.sinks;
    renderAuditSinks();
  }

  updatePreview();
}

// ─── Roles ───────────────────────────────────────────────────────────
function renderRoles() {
  const grid = document.getElementById('role-grid');
  grid.innerHTML = '';
  for (const [key, role] of Object.entries(PRESET_ROLES)) {
    const sel = selectedRoles[key];
    const card = document.createElement('div');
    card.className = 'role-card' + (sel ? ' selected' : '');
    card.dataset.role = key;
    card.onclick = () => { toggleRole(key); };
    card.innerHTML =
      '<div class="role-card-check">&#10003;</div>' +
      '<div class="role-name">' + role.label + '</div>' +
      '<div class="role-desc">' + role.desc + '</div>' +
      '<div class="role-tags">' +
        '<span class="role-tag">' + role.execution_mode + '</span>' +
        '<span class="role-tag">' + (role.token_budget_daily === -1 ? 'unlimited' : role.token_budget_daily.toLocaleString()) + ' budget</span>' +
      '</div>' +
      '<div class="role-details">' +
        '<div class="field"><label>Allowed Tools</label>' +
          '<input type="text" value="' + role.allowed_tools.join(', ') + '" onchange="updateRoleField(\\'' + key + '\\', \\'allowed_tools\\', this.value)" onclick="event.stopPropagation()">' +
        '</div>' +
        '<div class="field"><label>Blocked Tools</label>' +
          '<input type="text" value="' + role.blocked_tools.join(', ') + '" onchange="updateRoleField(\\'' + key + '\\', \\'blocked_tools\\', this.value)" onclick="event.stopPropagation()">' +
        '</div>' +
        '<div class="field"><label>Execution Mode</label>' +
          '<select onchange="updateRoleField(\\'' + key + '\\', \\'execution_mode\\', this.value)" onclick="event.stopPropagation()">' +
            '<option value="supervised"' + (role.execution_mode === 'supervised' ? ' selected' : '') + '>Supervised</option>' +
            '<option value="autonomous"' + (role.execution_mode === 'autonomous' ? ' selected' : '') + '>Autonomous</option>' +
            '<option value="dry_run"' + (role.execution_mode === 'dry_run' ? ' selected' : '') + '>Dry Run</option>' +
          '</select>' +
        '</div>' +
        '<div class="field"><label>Token Budget Daily</label>' +
          '<input type="number" value="' + role.token_budget_daily + '" onchange="updateRoleField(\\'' + key + '\\', \\'token_budget_daily\\', parseInt(this.value))" onclick="event.stopPropagation()">' +
        '</div>' +
      '</div>';
    grid.appendChild(card);
  }
}

function toggleRole(key) {
  selectedRoles[key] = !selectedRoles[key];
  renderRoles();
  updatePreview();
}

function updateRoleField(key, field, value) {
  if (field === 'allowed_tools' || field === 'blocked_tools') {
    PRESET_ROLES[key][field] = value.split(',').map(s => s.trim()).filter(Boolean);
  } else {
    PRESET_ROLES[key][field] = value;
  }
  updatePreview();
}

// ─── Section Toggle ──────────────────────────────────────────────────
function toggleSection(id) {
  document.getElementById(id).classList.toggle('collapsed');
}

// ─── Chip Groups ─────────────────────────────────────────────────────
function selectChip(el) {
  const group = el.parentElement;
  group.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');

  // Auth provider visibility
  if (group.id === 'auth-provider') {
    const val = el.dataset.value;
    document.getElementById('auth-env-fields').classList.toggle('hidden', val !== 'env');
    document.getElementById('auth-local-fields').classList.toggle('hidden', val !== 'local');
  }

  updatePreview();
}

function getChipValue(groupId) {
  const active = document.querySelector('#' + groupId + ' .chip.active');
  return active ? active.dataset.value : '';
}

function setChipValue(groupId, value) {
  const group = document.getElementById(groupId);
  if (!group) return;
  group.querySelectorAll('.chip').forEach(c => {
    c.classList.toggle('active', c.dataset.value === value);
  });
}

// ─── Custom Patterns ─────────────────────────────────────────────────
function addCustomPattern() {
  customPatterns.push({ name: '', pattern: '', severity: 'medium', action: 'audit' });
  renderCustomPatterns();
}

function renderCustomPatterns() {
  const container = document.getElementById('dlp-custom-patterns');
  container.innerHTML = '';
  customPatterns.forEach((p, i) => {
    const div = document.createElement('div');
    div.className = 'pattern-item';
    div.innerHTML =
      '<input type="text" placeholder="Name" value="' + esc(p.name) + '" onchange="customPatterns[' + i + '].name=this.value;updatePreview()">' +
      '<input type="text" placeholder="Regex pattern" value="' + esc(p.pattern) + '" onchange="customPatterns[' + i + '].pattern=this.value;updatePreview()">' +
      '<select onchange="customPatterns[' + i + '].severity=this.value;updatePreview()">' +
        '<option value="low"' + (p.severity==='low'?' selected':'') + '>Low</option>' +
        '<option value="medium"' + (p.severity==='medium'?' selected':'') + '>Medium</option>' +
        '<option value="high"' + (p.severity==='high'?' selected':'') + '>High</option>' +
        '<option value="critical"' + (p.severity==='critical'?' selected':'') + '>Critical</option>' +
      '</select>' +
      '<button class="btn-remove" onclick="customPatterns.splice(' + i + ',1);renderCustomPatterns();updatePreview()">&times;</button>';
    container.appendChild(div);
  });
}

// ─── Allowlist ───────────────────────────────────────────────────────
function addAllowlistEntry() {
  allowlistEntries.push('');
  renderAllowlist();
}

function renderAllowlist() {
  const container = document.getElementById('dlp-allowlist');
  container.innerHTML = '';
  allowlistEntries.forEach((entry, i) => {
    const div = document.createElement('div');
    div.className = 'allowlist-item';
    div.innerHTML =
      '<input type="text" placeholder="Pattern to allow" value="' + esc(entry) + '" onchange="allowlistEntries[' + i + ']=this.value;updatePreview()">' +
      '<button class="btn-remove" onclick="allowlistEntries.splice(' + i + ',1);renderAllowlist();updatePreview()">&times;</button>';
    container.appendChild(div);
  });
}

// ─── Audit Sinks ─────────────────────────────────────────────────────
function addAuditSink() {
  auditSinks.push({ type: 'jsonl', path: '' });
  renderAuditSinks();
}

function renderAuditSinks() {
  const container = document.getElementById('audit-sinks');
  container.innerHTML = '';
  auditSinks.forEach((sink, i) => {
    const div = document.createElement('div');
    div.className = 'sink-item';
    let inner = '<button class="btn-remove" onclick="auditSinks.splice(' + i + ',1);renderAuditSinks();updatePreview()">&times;</button>';
    inner += '<div class="field"><label>Sink Type</label>' +
      '<select onchange="auditSinks[' + i + '].type=this.value;renderAuditSinks();updatePreview()">' +
        '<option value="jsonl"' + (sink.type==='jsonl'?' selected':'') + '>JSONL File</option>' +
        '<option value="webhook"' + (sink.type==='webhook'?' selected':'') + '>Webhook</option>' +
        '<option value="postgres"' + (sink.type==='postgres'?' selected':'') + '>PostgreSQL</option>' +
      '</select></div>';
    if (sink.type === 'jsonl') {
      inner += '<div class="field"><label>File Path</label>' +
        '<input type="text" value="' + esc(sink.path || '') + '" placeholder="~/.pi/agent/audit.jsonl" ' +
        'onchange="auditSinks[' + i + '].path=this.value;updatePreview()"></div>';
    } else if (sink.type === 'webhook') {
      inner += '<div class="field"><label>Webhook URL</label>' +
        '<input type="text" value="' + esc(sink.url || '') + '" placeholder="https://..." ' +
        'onchange="auditSinks[' + i + '].url=this.value;updatePreview()"></div>';
    } else if (sink.type === 'postgres') {
      inner += '<div class="field"><label>Connection String</label>' +
        '<input type="text" value="' + esc(sink.connection || '') + '" placeholder="postgresql://..." ' +
        'onchange="auditSinks[' + i + '].connection=this.value;updatePreview()"></div>';
    }
    div.innerHTML = inner;
    container.appendChild(div);
  });
}

// ─── Preview Tabs ────────────────────────────────────────────────────
function switchTab(el) {
  document.querySelectorAll('.preview-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  activePreviewTab = el.dataset.tab;
  updatePreview();
}

// ─── YAML Generator ──────────────────────────────────────────────────
function toYaml(obj, indent) {
  indent = indent || 0;
  const pad = '  '.repeat(indent);
  let out = '';

  if (Array.isArray(obj)) {
    if (obj.length === 0) return ' []\\n';
    for (const item of obj) {
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        const keys = Object.keys(item);
        if (keys.length > 0) {
          out += pad + '- ' + keys[0] + ': ' + formatScalar(item[keys[0]]) + '\\n';
          for (let k = 1; k < keys.length; k++) {
            const val = item[keys[k]];
            if (typeof val === 'object' && val !== null) {
              out += pad + '  ' + keys[k] + ':\\n' + toYaml(val, indent + 2);
            } else {
              out += pad + '  ' + keys[k] + ': ' + formatScalar(val) + '\\n';
            }
          }
        }
      } else {
        out += pad + '- ' + formatScalar(item) + '\\n';
      }
    }
    return out;
  }

  if (typeof obj === 'object' && obj !== null) {
    for (const [key, val] of Object.entries(obj)) {
      if (val === undefined || val === null) continue;
      if (typeof val === 'object') {
        const yamlVal = toYaml(val, indent + 1);
        if (Array.isArray(val) && val.length === 0) {
          out += pad + key + ': []\\n';
        } else {
          out += pad + key + ':\\n' + yamlVal;
        }
      } else {
        out += pad + key + ': ' + formatScalar(val) + '\\n';
      }
    }
    return out;
  }

  return pad + formatScalar(obj) + '\\n';
}

function formatScalar(val) {
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'string') {
    if (val === '') return "''";
    if (val === 'true' || val === 'false' || !isNaN(val)) return "'" + val + "'";
    if (/[:#{}\\[\\],&*?|\\->!%@]/.test(val) || val.includes('\\\\')) return "'" + val.replace(/'/g, "''") + "'";
    return val;
  }
  return String(val);
}

// ─── Build Config Objects ────────────────────────────────────────────
function buildGovernanceConfig() {
  const cfg = {};

  // Auth
  const authProvider = getChipValue('auth-provider');
  cfg.auth = { provider: authProvider };
  if (authProvider === 'env') {
    cfg.auth.env = {
      user_var: document.getElementById('auth-user-var').value || 'PI_RBAC_USER',
      role_var: document.getElementById('auth-role-var').value || 'PI_RBAC_ROLE',
      org_unit_var: document.getElementById('auth-org-unit-var').value || 'PI_RBAC_ORG_UNIT'
    };
  } else if (authProvider === 'local') {
    cfg.auth.local = {
      users_file: document.getElementById('auth-users-file').value || './users.yaml'
    };
  }

  // Policy
  cfg.policy = {
    engine: 'yaml',
    yaml: { rules_file: './governance-rules.yaml' }
  };

  // HITL
  cfg.hitl = {
    default_mode: getChipValue('hitl-mode') || 'supervised',
    approval_channel: document.getElementById('hitl-channel').value,
    timeout_seconds: parseInt(document.getElementById('hitl-timeout').value) || 300
  };
  if (cfg.hitl.approval_channel === 'webhook') {
    const url = document.getElementById('hitl-webhook-url').value;
    if (url) cfg.hitl.webhook = { url: url };
  }

  // Audit
  cfg.audit = { sinks: auditSinks.filter(s => {
    if (s.type === 'jsonl') return s.path;
    if (s.type === 'webhook') return s.url;
    if (s.type === 'postgres') return s.connection;
    return false;
  }).map(s => {
    if (s.type === 'jsonl') return { type: 'jsonl', path: s.path };
    if (s.type === 'webhook') return { type: 'webhook', url: s.url };
    if (s.type === 'postgres') return { type: 'postgres', connection: s.connection };
    return s;
  })};

  // DLP
  if (document.getElementById('dlp-enabled').checked) {
    cfg.dlp = {
      enabled: true,
      mode: getChipValue('dlp-mode') || 'audit'
    };
    const onInput = document.getElementById('dlp-on-input').value;
    const onOutput = document.getElementById('dlp-on-output').value;
    if (onInput) cfg.dlp.on_input = onInput;
    if (onOutput) cfg.dlp.on_output = onOutput;
    cfg.dlp.masking = {
      strategy: document.getElementById('dlp-mask-strategy').value,
      show_chars: parseInt(document.getElementById('dlp-mask-show').value) || 4,
      placeholder: document.getElementById('dlp-mask-placeholder').value || '***'
    };
    cfg.dlp.severity_threshold = getChipValue('dlp-severity') || 'low';
    cfg.dlp.built_in = {
      secrets: document.getElementById('dlp-secrets').checked,
      pii: document.getElementById('dlp-pii').checked
    };
    const patterns = customPatterns.filter(p => p.name && p.pattern);
    if (patterns.length > 0) cfg.dlp.custom_patterns = patterns;
    const al = allowlistEntries.filter(Boolean);
    if (al.length > 0) cfg.dlp.allowlist = al.map(p => ({ pattern: p }));
  } else {
    cfg.dlp = { enabled: false };
  }

  return cfg;
}

function buildRulesConfig() {
  const roles = {};
  for (const [key, sel] of Object.entries(selectedRoles)) {
    if (!sel) continue;
    const r = PRESET_ROLES[key];
    const role = {
      allowed_tools: r.allowed_tools,
      blocked_tools: r.blocked_tools,
      prompt_template: r.prompt_template,
      execution_mode: r.execution_mode,
      human_approval: r.human_approval,
      token_budget_daily: r.token_budget_daily,
      allowed_paths: r.allowed_paths,
      blocked_paths: r.blocked_paths
    };
    if (r.bash_overrides) role.bash_overrides = r.bash_overrides;
    roles[key] = role;
  }
  return { roles: roles };
}

// ─── Update Preview ──────────────────────────────────────────────────
function updatePreview() {
  const el = document.getElementById('preview-yaml');
  if (activePreviewTab === 'governance') {
    const cfg = buildGovernanceConfig();
    el.textContent = '# governance.yaml\\n# Generated by Pi Governance Setup Wizard\\n\\n' + toYaml(cfg);
  } else {
    const rules = buildRulesConfig();
    el.textContent = '# governance-rules.yaml\\n# Generated by Pi Governance Setup Wizard\\n\\n' + toYaml(rules);
  }
}

// ─── Save ────────────────────────────────────────────────────────────
async function handleSave() {
  const btn = document.getElementById('btn-save');
  const status = document.getElementById('save-status');
  btn.disabled = true;
  status.textContent = 'Saving...';
  status.className = 'save-status';

  try {
    const payload = {
      governance: buildGovernanceConfig(),
      rules: buildRulesConfig()
    };
    const res = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Server error');
    }
    const result = await res.json();
    showToast('Configuration saved!', 'success');
    status.textContent = 'Saved: ' + (result.files || []).join(', ');
    status.className = 'save-status success';
  } catch (e) {
    showToast('Failed to save: ' + e.message, 'error');
    status.textContent = 'Error: ' + e.message;
    status.className = 'save-status error';
  } finally {
    btn.disabled = false;
  }
}

async function handleClose() {
  try { await fetch('/api/close', { method: 'POST' }); } catch (e) { /* ignore */ }
  window.close();
}

// ─── Toast ───────────────────────────────────────────────────────────
function showToast(msg, type) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast ' + type + ' visible';
  setTimeout(() => { toast.classList.remove('visible'); }, 3000);
}

// ─── Util ────────────────────────────────────────────────────────────
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
</script>
</body>
</html>`;
