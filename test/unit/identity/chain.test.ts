import { describe, it, expect } from 'vitest';
import { IdentityChain, createIdentityChain } from '../../../src/lib/identity/chain.js';
import type { IdentityProvider, ResolvedIdentity } from '../../../src/lib/identity/provider.js';

function makeProvider(name: string, result: ResolvedIdentity | null): IdentityProvider {
  return {
    name,
    resolve: async () => result,
  };
}

describe('IdentityChain', () => {
  it('returns the first provider that resolves', async () => {
    const chain = new IdentityChain([
      makeProvider('first', {
        userId: 'alice',
        role: 'admin',
        orgUnit: 'platform',
        source: 'first',
      }),
      makeProvider('second', {
        userId: 'bob',
        role: 'developer',
        orgUnit: 'default',
        source: 'second',
      }),
    ]);

    const identity = await chain.resolve();
    expect(identity.userId).toBe('alice');
    expect(identity.source).toBe('first');
  });

  it('skips providers that return null and uses the next one', async () => {
    const chain = new IdentityChain([
      makeProvider('first', null),
      makeProvider('second', {
        userId: 'bob',
        role: 'developer',
        orgUnit: 'eng',
        source: 'second',
      }),
    ]);

    const identity = await chain.resolve();
    expect(identity.userId).toBe('bob');
    expect(identity.source).toBe('second');
  });

  it('returns fallback identity when no provider resolves', async () => {
    const chain = new IdentityChain([makeProvider('first', null), makeProvider('second', null)]);

    const identity = await chain.resolve();
    expect(identity).toEqual({
      userId: 'unknown',
      role: 'analyst',
      orgUnit: 'default',
      source: 'fallback',
    });
  });

  it('returns fallback identity when the chain has no providers', async () => {
    const chain = new IdentityChain([]);
    const identity = await chain.resolve();

    expect(identity.userId).toBe('unknown');
    expect(identity.role).toBe('analyst');
    expect(identity.source).toBe('fallback');
  });
});

describe('createIdentityChain', () => {
  it('creates a chain with default env provider when no config is given', async () => {
    // With no env vars set for PI_RBAC_USER/PI_RBAC_ROLE, the env provider will return null,
    // so we should get the fallback identity
    const savedUser = process.env.PI_RBAC_USER;
    const savedRole = process.env.PI_RBAC_ROLE;
    delete process.env.PI_RBAC_USER;
    delete process.env.PI_RBAC_ROLE;

    const chain = createIdentityChain();
    const identity = await chain.resolve();
    expect(identity.source).toBe('fallback');

    // Restore
    if (savedUser !== undefined) process.env.PI_RBAC_USER = savedUser;
    if (savedRole !== undefined) process.env.PI_RBAC_ROLE = savedRole;
  });
});
