export interface ParsedSessionKey {
  agentId: string;
  channel: string;
  chatType: 'dm' | 'group';
  peerId: string;
  groupId?: string;
}

/**
 * Parse an OpenClaw session key into its components.
 *
 * Supported formats:
 *   agent:<agentId>:<channel>:dm:<peerId>
 *   agent:<agentId>:<channel>:group:<groupId>:<peerId>
 *
 * Returns null for unrecognised formats (e.g. "agent:<id>:main").
 */
export function parseSessionKey(key: string): ParsedSessionKey | null {
  const parts = key.split(':');

  if (parts[0] !== 'agent' || parts.length < 5) return null;

  const agentId = parts[1]!;
  const channel = parts[2]!;
  const chatType = parts[3];

  if (chatType === 'dm' && parts.length === 5) {
    return { agentId, channel, chatType: 'dm', peerId: parts[4]! };
  }

  if (chatType === 'group' && parts.length === 6) {
    return { agentId, channel, chatType: 'group', groupId: parts[4]!, peerId: parts[5]! };
  }

  return null;
}
