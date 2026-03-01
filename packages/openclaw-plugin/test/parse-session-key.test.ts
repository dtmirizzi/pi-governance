import { describe, it, expect } from 'vitest';
import { parseSessionKey } from '../src/parse-session-key.js';

describe('parseSessionKey', () => {
  it('parses a WhatsApp DM key', () => {
    const result = parseSessionKey('agent:abc123:whatsapp:dm:+15550123');
    expect(result).toEqual({
      agentId: 'abc123',
      channel: 'whatsapp',
      chatType: 'dm',
      peerId: '+15550123',
    });
  });

  it('parses a Discord DM key', () => {
    const result = parseSessionKey('agent:bot99:discord:dm:428374928374');
    expect(result).toEqual({
      agentId: 'bot99',
      channel: 'discord',
      chatType: 'dm',
      peerId: '428374928374',
    });
  });

  it('parses a group chat key', () => {
    const result = parseSessionKey('agent:abc123:telegram:group:chat789:user456');
    expect(result).toEqual({
      agentId: 'abc123',
      channel: 'telegram',
      chatType: 'group',
      groupId: 'chat789',
      peerId: 'user456',
    });
  });

  it('returns null for invalid formats', () => {
    expect(parseSessionKey('')).toBeNull();
    expect(parseSessionKey('not-a-session-key')).toBeNull();
    expect(parseSessionKey('agent:abc')).toBeNull();
    expect(parseSessionKey('user:abc:whatsapp:dm:+1')).toBeNull();
  });

  it('returns null for agent:<id>:main (direct operator, no channel)', () => {
    expect(parseSessionKey('agent:abc123:main')).toBeNull();
  });
});
