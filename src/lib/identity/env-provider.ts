import type { IdentityProvider, ResolvedIdentity } from './provider.js';

export class EnvIdentityProvider implements IdentityProvider {
  name = 'env';

  constructor(
    private userVar: string = 'PI_RBAC_USER',
    private roleVar: string = 'PI_RBAC_ROLE',
    private orgUnitVar: string = 'PI_RBAC_ORG_UNIT',
  ) {}

  async resolve(): Promise<ResolvedIdentity | null> {
    const userId = process.env[this.userVar];
    const role = process.env[this.roleVar];
    const orgUnit = process.env[this.orgUnitVar];

    if (!userId || !role) return null;

    return {
      userId,
      role,
      orgUnit: orgUnit ?? 'default',
      source: 'env',
    };
  }
}
