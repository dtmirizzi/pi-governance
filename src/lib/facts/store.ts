export interface RoleBinding {
  userId: string;
  role: string;
  orgUnit: string;
  config?: Record<string, unknown>;
}

export interface Relation {
  subject: string;
  predicate: string;
  object: string;
}

export interface FactStore {
  getRoles(userId: string): Promise<RoleBinding[]>;
  getAllRoleBindings(): Promise<RoleBinding[]>;
  getRelations(subject: string, predicate: string): Promise<Relation[]>;
}
