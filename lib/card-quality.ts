import { defaultQualityPolicy, type QualityPolicy } from "./quality-policy.ts";
import { z } from "zod";

const text = z.string().trim().max(10000).default("");
export const briefFields = z.object({
  audience: text, problem: text, outcome: text, scope: text, exclusions: text, decisions: text,
}).strict();
export const bugFields = z.object({
  reporter: text, discoveredAt: z.string().max(80).default(""), affectedVersion: text,
  environment: text, preconditions: text, steps: text, expected: text, actual: text,
  frequency: text, impact: text,
  reproduction: z.enum(["Untriaged", "Confirmed", "Intermittent", "Not reproduced"]).default("Untriaged"),
  investigation: text, rootCause: text, fixSummary: text, regressionTest: text, fixedIn: text,
  duplicateOf: z.uuid().nullable().default(null),
}).strict();
export const executionFields = z.object({
  planningRequired: z.boolean().default(false), approach: text, approved: z.boolean().default(false),
  blockers: z.array(z.uuid()).max(100).default([]),
  verificationRequired: z.boolean().default(false), testPlan: text,
  result: z.enum(["Pending", "Passed", "Failed"]).default("Pending"), evidence: text,
  brief: briefFields.optional(), bug: bugFields.optional(), parentId: z.uuid().nullable().optional(),
}).strict();
export type Execution = z.output<typeof executionFields>;
export type QualityCard = {kind: string; status: string; criteria: string; description?: string; severity?: string; execution?: Execution | null};

// Unknowns are allowed at intake; readiness and completion use observable requirements.
// Legacy descriptions remain intact. Structured requirements apply when a brief/report is adopted.
export function qualityIssues(card: QualityCard, status = card.status, policy: QualityPolicy = defaultQualityPolicy): string[] {
  if (["Backlog", "Reported", "Triage"].includes(status)) return [];
  const issues: string[] = [];
  const plan = card.execution;
  const require = (value: string | undefined, label: string) => { if (!value?.trim()) issues.push(label); };
  require(card.criteria, "Acceptance criteria");
  require(plan?.testPlan, "Test plan");
  if (policy.requireStructuredBrief && card.kind === "development" && plan?.brief) {
    require(plan.brief.problem, "Problem to solve");
    require(plan.brief.outcome, "Intended outcome");
    require(plan.brief.scope, "Scope");
  }
  if (policy.requireBugDetails && card.kind === "bug" && plan?.bug) {
    const bug = plan.bug;
    for (const [value, label] of [[bug.environment, "Environment"], [bug.affectedVersion, "Affected version"],
      [bug.steps, "Reproduction steps"], [bug.expected, "Expected behavior"], [bug.actual, "Actual behavior"],
      [bug.impact, "User impact"]]) require(value, label);
    require(card.severity, "Bug severity");
    if (bug.reproduction === "Untriaged") issues.push("Reproduction assessment");
    if (bug.reproduction === "Not reproduced") require(bug.investigation, "Investigation evidence for unreproduced bug");
  }
  if (plan?.planningRequired && (!plan.approved || !plan.approach.trim())) issues.push("Reviewed implementation plan");
  if (["Done", "Closed"].includes(status)) {
    if (plan?.result !== "Passed") issues.push("Passing test result");
    require(plan?.evidence, "Verification evidence");
    if (card.kind === "bug" && plan?.bug) {
      require(plan.bug.rootCause, "Root-cause findings (or explicit unresolved cause)");
      require(plan.bug.fixSummary, "Fix summary");
      require(plan.bug.regressionTest, "Regression test evidence");
      require(plan.bug.fixedIn, "Fixed-in version or release");
    }
  }
  return [...new Set(issues)];
}

// Deep merge only the structured sections. Arrays replace; omitted values are preserved.
export function mergeExecution(current: Execution | null | undefined, patch: Record<string, unknown>): Execution {
  const before = current ?? executionFields.parse({});
  return executionFields.parse({...before, ...patch,
    ...(patch.brief ? {brief: {...before.brief, ...(patch.brief as object)}} : {}),
    ...(patch.bug ? {bug: {...before.bug, ...(patch.bug as object)}} : {}),
  });
}

// Reopening invalidates the current verification; the activity log retains prior evidence.
export function executionAfterTransition(execution: Execution, previousStatus: string | undefined, nextStatus: string): Execution {
  const completed = (status: string | undefined) => status === "Done" || status === "Closed";
  if (!completed(previousStatus) || completed(nextStatus)) return execution;
  return {...execution, result: "Pending", evidence: "",
    ...(execution.bug ? {bug: {...execution.bug, regressionTest: "", fixedIn: ""}} : {}),
  };
}
