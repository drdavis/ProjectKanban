import {workFields} from "./collaboration.ts";
import { z } from "zod";
import { briefFields, bugFields, executionFields } from "./card-quality.ts";
import { releaseFields } from "./roadmap.ts";
const revision = z.number().int().nonnegative();
// Partial updates must not apply creation defaults to omitted fields.
const briefPatch = z.object({
  audience: briefFields.shape.audience.removeDefault().optional(),
  problem: briefFields.shape.problem.removeDefault().optional(),
  outcome: briefFields.shape.outcome.removeDefault().optional(),
  scope: briefFields.shape.scope.removeDefault().optional(),
  exclusions: briefFields.shape.exclusions.removeDefault().optional(),
  decisions: briefFields.shape.decisions.removeDefault().optional(),
}).strict();
const bugPatch = z.object({
  reporter: bugFields.shape.reporter.removeDefault().optional(),
  discoveredAt: bugFields.shape.discoveredAt.removeDefault().optional(),
  affectedVersion: bugFields.shape.affectedVersion.removeDefault().optional(),
  environment: bugFields.shape.environment.removeDefault().optional(),
  preconditions: bugFields.shape.preconditions.removeDefault().optional(),
  steps: bugFields.shape.steps.removeDefault().optional(),
  expected: bugFields.shape.expected.removeDefault().optional(),
  actual: bugFields.shape.actual.removeDefault().optional(),
  frequency: bugFields.shape.frequency.removeDefault().optional(),
  impact: bugFields.shape.impact.removeDefault().optional(),
  reproduction: bugFields.shape.reproduction.removeDefault().optional(),
  investigation: bugFields.shape.investigation.removeDefault().optional(),
  rootCause: bugFields.shape.rootCause.removeDefault().optional(),
  fixSummary: bugFields.shape.fixSummary.removeDefault().optional(),
  regressionTest: bugFields.shape.regressionTest.removeDefault().optional(),
  fixedIn: bugFields.shape.fixedIn.removeDefault().optional(),
  duplicateOf: bugFields.shape.duplicateOf.removeDefault().optional(),
}).strict();
const workPatch=z.object({client:workFields.shape.client.removeDefault().optional(),agency:workFields.shape.agency.removeDefault().optional(),assigneeId:workFields.shape.assigneeId.removeDefault().optional(),dueDate:workFields.shape.dueDate.removeDefault().optional(),checklist:workFields.shape.checklist.removeDefault().optional(),recurrenceDays:workFields.shape.recurrenceDays.removeDefault().optional(),cycle:workFields.shape.cycle.removeDefault().optional(),outcome:workFields.shape.outcome.removeDefault().optional(),impact:workFields.shape.impact.removeDefault().optional(),effort:workFields.shape.effort.removeDefault().optional(),source:workFields.shape.source.removeDefault().optional()}).strict();
const executionPatch = z.object({
  planningRequired: executionFields.shape.planningRequired.removeDefault().optional(),
  approach: executionFields.shape.approach.removeDefault().optional(),
  approved: executionFields.shape.approved.removeDefault().optional(),
  blockers: executionFields.shape.blockers.removeDefault().optional(),
  verificationRequired: executionFields.shape.verificationRequired.removeDefault().optional(),
  testPlan: executionFields.shape.testPlan.removeDefault().optional(),
  result: executionFields.shape.result.removeDefault().optional(),
  evidence: executionFields.shape.evidence.removeDefault().optional(),
  attachmentSummary: executionFields.shape.attachmentSummary.unwrap().removeDefault().optional(),
  work: workPatch.optional(),
  parentId: executionFields.shape.parentId,
  brief: briefPatch.optional(), bug: bugPatch.optional(),
}).strict();
const assignment = z.object({releaseId:z.uuid(),phase:z.string().trim().min(1).max(100).optional(),milestone:z.string().trim().min(1).max(100).optional()}).strict();
export const patchFields = z.object({
  title: z.string().trim().min(1).max(180).optional(), description:z.string().max(10000).optional(),
  acceptanceCriteria:z.string().max(10000).optional(), priority:z.enum(["Urgent","High","Normal","Low"]).optional(),
  severity:z.enum(["","Critical","Major","Moderate","Minor"]).optional(),
  responsible:z.string().trim().max(100).optional(), tags:z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  link:z.union([z.literal(""),z.url({protocol:/^https?$/})]).optional(),
  execution:executionPatch.optional(), roadmapAssignment:assignment.nullable().optional(),
}).strict();
export const createArgs = patchFields.extend({board:z.enum(["development","bug"]),title:z.string().trim().min(1).max(180),requestId:z.uuid().optional(),expectedRevision:revision.optional()}).strict();
export const moveArgs = z.object({cardId:z.uuid(),status:z.string().trim().min(1).max(30),expectedRevision:revision.optional()}).strict();
export const updateArgs = z.object({cardId:z.uuid(),expectedRevision:revision,fields:patchFields.refine(x=>Object.keys(x).length>0,"Supply at least one field")}).strict();
export const roadmapArgs = z.object({expectedRevision:revision,requestId:z.uuid(),reviewed:z.literal(true),
  roadmap:z.string().trim().max(12000),releases:z.array(releaseFields.extend({id:z.uuid()}).strict()).max(100).optional(),
}).strict();
