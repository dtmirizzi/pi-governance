export const SAFE_PATTERNS: RegExp[] = [
  // File viewing
  /^(cat|head|tail|less|more)\s/,
  /^(file|stat|wc|md5sum|sha256sum)\s/,

  // Directory listing
  /^(ls|ll|la|tree|du|df)\b/,
  /^(pwd|cd)\b/,

  // Searching
  /^(grep|rg|ag|ack|find|fd|locate)\s/,
  /^(which|whereis|type|command)\s/,

  // Text processing (read-only)
  /^(sort|uniq|cut|awk|sed)\s.*(?!-i)/, // sed without -i (in-place)
  /^(tr|diff|comm|join|paste)\s/,
  /^(jq|yq|xmlstarlet)\s/,

  // Git (read-only operations)
  /^git\s+(log|status|diff|show|blame|branch|tag|remote|stash list)\b/,
  /^git\s+(ls-files|ls-tree|rev-parse|describe)\b/,

  // System info
  /^(whoami|id|groups|uname|hostname|date|uptime|env|printenv)\b/,
  /^(echo|printf)\s/,

  // Package info (not install)
  /^(npm|yarn|pnpm)\s+(list|ls|info|show|view|outdated|audit)\b/,
  /^pip\s+(list|show|freeze)\b/,
  /^(node|python|ruby|go)\s+--version\b/,
  /^(node|python|ruby)\s+-e\s/,

  // Networking (read-only)
  /^(ping|dig|nslookup|host|traceroute|tracepath)\s/,
  /^curl\s.*--head\b/,
  /^curl\s.*-I\b/,

  // Additional file viewing / inspection
  /^(basename|dirname|realpath|readlink)\s/,
  /^(xxd|od|hexdump)\s/,
  /^(strings|nm|objdump)\s/,

  // Additional search / navigation
  /^(xargs)\s/,
  /^(tee)\s/,

  // Additional text processing (read-only)
  /^(fmt|fold|column|expand|unexpand)\s/,
  /^(tac|rev|nl)\s/,
  /^(yes|seq|shuf)\s/,

  // Additional system info
  /^(lsof|ps|top|htop|vmstat|iostat|free|df)\b/,
  /^(lscpu|lsblk|lsusb|lspci)\b/,
  /^(nproc|getconf)\b/,

  // Additional git read-only
  /^git\s+(config\s+--get|config\s+-l|shortlog|reflog|cherry)\b/,
  /^git\s+(cat-file|count-objects|fsck|verify-pack)\b/,
];

export const DANGEROUS_PATTERNS: RegExp[] = [
  // Destructive file operations
  /\brm\s+(-[a-zA-Z]*r|-[a-zA-Z]*f|--recursive|--force)\b/,
  /\brm\s+-[a-zA-Z]*rf\b/,
  /\bshred\b/,

  // Privilege escalation
  /\bsudo\b/,
  /\bsu\s+-?\s*\w/,
  /\bdoas\b/,

  // Permission/ownership changes
  /\bchmod\b/,
  /\bchown\b/,
  /\bchgrp\b/,

  // Disk/partition operations
  /\bdd\b.*\bof=/,
  /\bmkfs\b/,
  /\bfdisk\b/,
  /\bparted\b/,
  /\bmount\b/,
  /\bumount\b/,

  // Remote code execution
  /\bcurl\b.*\|\s*(bash|sh|zsh|python|perl|ruby)\b/,
  /\bwget\b.*\|\s*(bash|sh|zsh|python|perl|ruby)\b/,
  /\bcurl\b.*>\s*.*\.sh\s*&&/,

  // Remote access
  /\bssh\b/,
  /\bscp\b/,
  /\brsync\b.*:\//,
  /\bnc\s+(-[a-zA-Z]*l|-[a-zA-Z]*p|--listen)\b/,
  /\bncat\b/,
  /\bsocat\b/,
  /\btelnet\b/,

  // System modification
  /\bsystemctl\s+(start|stop|restart|enable|disable)\b/,
  /\bservice\s+\w+\s+(start|stop|restart)\b/,
  /\biptables\b/,
  /\bufw\b/,
  /\bfirewall-cmd\b/,

  // Package installation (can run arbitrary post-install scripts)
  /\bnpm\s+(install|i|add|ci)\b/,
  /\byarn\s+(add|install)\b/,
  /\bpnpm\s+(add|install|i)\b/,
  /\bpip\s+install\b/,
  /\bapt(-get)?\s+install\b/,
  /\bbrew\s+install\b/,
  /\bcargo\s+install\b/,

  // Environment variable manipulation (can leak secrets)
  /\bexport\b.*(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)/i,

  // Cron / scheduled tasks
  /\bcrontab\b/,
  /\bat\s+/,

  // Container escape vectors
  /\bdocker\s+(run|exec|build|push|pull)\b/,
  /\bkubectl\s+(exec|run|apply|delete)\b/,

  // Process manipulation
  /\bkill\b/,
  /\bkillall\b/,
  /\bpkill\b/,

  // History manipulation
  /\bhistory\s+-c\b/,
  /\bunset\s+HISTFILE\b/,

  // Compiler/build (can execute arbitrary code)
  /\bmake\s/,
  /\bgcc\b/,
  /\bg\+\+/,

  // Governance config tampering — shell-based writes to governance files
  /(cat|echo|printf)\s.*>\s*.*governance(-rules)?\.yaml/,
  /\btee\s+.*governance(-rules)?\.yaml/,
  /sed\s+-i.*governance(-rules)?\.yaml/,
  /(cp|mv|rm)\s.*governance(-rules)?\.yaml/,
  /(cat|echo|printf)\s.*>\s*.*\.pi\/governance/,
  /\btee\s+.*\.pi\/governance/,
  /sed\s+-i.*\.pi\/governance/,
  /(cp|mv|rm)\s.*\.pi\/governance/,
];
