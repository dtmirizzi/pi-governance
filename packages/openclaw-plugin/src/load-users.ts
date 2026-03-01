import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';

export interface UserEntry {
  role: string;
  org_unit?: string;
}

export interface UsersConfig {
  users: Record<string, UserEntry>;
  default?: UserEntry;
}

/** Load and parse an openclaw-users.yaml file. */
export function loadUsers(filePath: string): UsersConfig {
  const raw = readFileSync(filePath, 'utf-8');
  const parsed = parseYaml(raw) as UsersConfig;
  return {
    users: parsed.users ?? {},
    default: parsed.default,
  };
}

/** Look up a channel user, falling back to `default`. Returns null if neither matches. */
export function lookupUser(config: UsersConfig, channel: string, peerId: string): UserEntry | null {
  const key = `${channel}:${peerId}`;
  return config.users[key] ?? config.default ?? null;
}
