export interface ResolvedIdentity {
  userId: string;
  role: string;
  orgUnit: string;
  source: string;
}

export interface IdentityProvider {
  name: string;
  resolve(): Promise<ResolvedIdentity | null>;
}
