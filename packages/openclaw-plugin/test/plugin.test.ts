import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { plugin } from '../src/index.js';

const USERS_FILE = join(import.meta.dirname, 'fixtures', 'test-users.yaml');

describe('openclaw-governance plugin', () => {
  const savedEnv: Record<string, string | undefined> = {};
  const envKeys = ['GRWND_USER', 'GRWND_ROLE', 'GRWND_ORG_UNIT'] as const;

  beforeEach(() => {
    for (const key of envKeys) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  function createMockApi() {
    const handlers: Record<string, ((ctx: { sessionKey?: string }) => void)[]> = {};
    return {
      on(event: string, handler: (ctx: { sessionKey?: string }) => void) {
        handlers[event] ??= [];
        handlers[event]!.push(handler);
      },
      emit(event: string, ctx: { sessionKey?: string }) {
        for (const h of handlers[event] ?? []) {
          h(ctx);
        }
      },
    };
  }

  it('sets env vars from WhatsApp DM session key', () => {
    const api = createMockApi();
    plugin.register(api, { users_file: USERS_FILE });

    api.emit('session_start', { sessionKey: 'agent:a1:whatsapp:dm:+15550123' });

    expect(process.env.GRWND_USER).toBe('whatsapp:+15550123');
    expect(process.env.GRWND_ROLE).toBe('report_author');
    expect(process.env.GRWND_ORG_UNIT).toBe('field-ops');
  });

  it('uses default role for unknown user', () => {
    const api = createMockApi();
    plugin.register(api, { users_file: USERS_FILE });

    api.emit('session_start', { sessionKey: 'agent:a1:whatsapp:dm:+19999999' });

    expect(process.env.GRWND_USER).toBe('whatsapp:+19999999');
    expect(process.env.GRWND_ROLE).toBe('analyst');
    expect(process.env.GRWND_ORG_UNIT).toBe('default');
  });

  it('does not set env vars for unparseable session key', () => {
    const api = createMockApi();
    plugin.register(api, { users_file: USERS_FILE });

    api.emit('session_start', { sessionKey: 'agent:a1:main' });

    expect(process.env.GRWND_USER).toBeUndefined();
    expect(process.env.GRWND_ROLE).toBeUndefined();
    expect(process.env.GRWND_ORG_UNIT).toBeUndefined();
  });

  it('resolves Discord user correctly', () => {
    const api = createMockApi();
    plugin.register(api, { users_file: USERS_FILE });

    api.emit('message_received', { sessionKey: 'agent:b2:discord:dm:428374928374' });

    expect(process.env.GRWND_USER).toBe('discord:428374928374');
    expect(process.env.GRWND_ROLE).toBe('admin');
    expect(process.env.GRWND_ORG_UNIT).toBe('platform');
  });
});
