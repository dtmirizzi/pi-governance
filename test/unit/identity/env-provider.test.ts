import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EnvIdentityProvider } from '../../../src/lib/identity/env-provider.js';

describe('EnvIdentityProvider', () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    // Save current env values
    savedEnv.PI_RBAC_USER = process.env.PI_RBAC_USER;
    savedEnv.PI_RBAC_ROLE = process.env.PI_RBAC_ROLE;
    savedEnv.PI_RBAC_ORG_UNIT = process.env.PI_RBAC_ORG_UNIT;
    // Clear them
    delete process.env.PI_RBAC_USER;
    delete process.env.PI_RBAC_ROLE;
    delete process.env.PI_RBAC_ORG_UNIT;
  });

  afterEach(() => {
    // Restore original env values
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('resolves identity from environment variables', async () => {
    process.env.PI_RBAC_USER = 'alice';
    process.env.PI_RBAC_ROLE = 'admin';
    process.env.PI_RBAC_ORG_UNIT = 'platform';

    const provider = new EnvIdentityProvider();
    const identity = await provider.resolve();

    expect(identity).toEqual({
      userId: 'alice',
      role: 'admin',
      orgUnit: 'platform',
      source: 'env',
    });
  });

  it('defaults orgUnit to "default" when PI_RBAC_ORG_UNIT is not set', async () => {
    process.env.PI_RBAC_USER = 'bob';
    process.env.PI_RBAC_ROLE = 'developer';

    const provider = new EnvIdentityProvider();
    const identity = await provider.resolve();

    expect(identity).not.toBeNull();
    expect(identity!.orgUnit).toBe('default');
  });

  it('returns null when all env vars are missing', async () => {
    const provider = new EnvIdentityProvider();
    const identity = await provider.resolve();

    expect(identity).toBeNull();
  });

  it('returns null when only PI_RBAC_USER is set (partial vars)', async () => {
    process.env.PI_RBAC_USER = 'alice';

    const provider = new EnvIdentityProvider();
    const identity = await provider.resolve();

    expect(identity).toBeNull();
  });

  it('supports custom env var names', async () => {
    process.env.MY_USER = 'charlie';
    process.env.MY_ROLE = 'lead';
    process.env.MY_ORG = 'infra';

    const provider = new EnvIdentityProvider('MY_USER', 'MY_ROLE', 'MY_ORG');
    const identity = await provider.resolve();

    expect(identity).toEqual({
      userId: 'charlie',
      role: 'lead',
      orgUnit: 'infra',
      source: 'env',
    });

    // Clean up custom vars
    delete process.env.MY_USER;
    delete process.env.MY_ROLE;
    delete process.env.MY_ORG;
  });
});
