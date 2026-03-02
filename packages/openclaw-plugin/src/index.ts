import { resolve } from 'node:path';
import { parseSessionKey } from './parse-session-key.js';
import { loadUsers, type UsersConfig } from './load-users.js';

export { parseSessionKey, type ParsedSessionKey } from './parse-session-key.js';
export { loadUsers, lookupUser, type UserEntry, type UsersConfig } from './load-users.js';

interface PluginConfig {
  users_file?: string;
}

interface PluginApi {
  on(event: string, handler: (ctx: { sessionKey?: string }) => void): void;
}

function applyIdentity(usersConfig: UsersConfig, sessionKey: string | undefined): void {
  if (!sessionKey) return;

  const parsed = parseSessionKey(sessionKey);
  if (!parsed) return;

  const user = usersConfig.users[`${parsed.channel}:${parsed.peerId}`] ?? usersConfig.default;
  if (!user) return;

  process.env.PI_RBAC_USER = `${parsed.channel}:${parsed.peerId}`;
  process.env.PI_RBAC_ROLE = user.role;
  if (user.org_unit) {
    process.env.PI_RBAC_ORG_UNIT = user.org_unit;
  }
}

export const plugin = {
  id: 'grwnd-openclaw-governance',

  configSchema: {
    type: 'object' as const,
    properties: {
      users_file: { type: 'string' as const, default: './openclaw-users.yaml' },
    },
  },

  register(api: PluginApi, config: PluginConfig = {}) {
    const usersFile = resolve(config.users_file ?? './openclaw-users.yaml');
    const usersConfig = loadUsers(usersFile);

    api.on('session_start', (ctx) => {
      applyIdentity(usersConfig, ctx.sessionKey);
    });

    api.on('message_received', (ctx) => {
      applyIdentity(usersConfig, ctx.sessionKey);
    });
  },
};

// Top-level named export expected by OpenClaw plugin loader
export const register = plugin.register.bind(plugin);
