export type PolicyDecision = 'allow' | 'deny' | 'needs_approval';
export type PathOperation = 'read' | 'write';
export type ExecutionMode = 'autonomous' | 'supervised' | 'dry_run';

export interface BashOverrides {
  additionalBlocked?: RegExp[];
  additionalAllowed?: RegExp[];
}

export interface PolicyEngine {
  evaluateTool(role: string, tool: string): PolicyDecision;
  evaluatePath(
    role: string,
    orgUnit: string,
    operation: PathOperation,
    path: string,
  ): PolicyDecision;
  requiresApproval(role: string, tool: string): boolean;
  getExecutionMode(role: string): ExecutionMode;
  getTemplateName(role: string): string;
  getBashOverrides(role: string): BashOverrides;
  getTokenBudget(role: string): number;
}
